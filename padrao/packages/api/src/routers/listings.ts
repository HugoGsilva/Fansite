import { TRPCError } from "@trpc/server";
import { eq, and, or, ilike, gte, lte, desc, asc, sql } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../index";
import { db } from "@padrao/db";
import { listing, datasetItem, userProfile } from "@padrao/db/schema/marketplace";
import { user } from "@padrao/db/schema/auth";
import {
	createListingSchema,
	updateListingSchema,
	searchListingsSchema,
	listingIdSchema,
} from "../validators/marketplace";
import { nanoid } from "nanoid";

export const listingsRouter = router({
	create: protectedProcedure
		.input(createListingSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check if user is banned
			const profile = await db.query.userProfile.findFirst({
				where: eq(userProfile.userId, userId),
			});

			if (profile?.isBanned) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Account suspended",
				});
			}

			// Verify item exists in dataset
			const item = await db.query.datasetItem.findFirst({
				where: eq(datasetItem.id, input.itemId),
			});

			if (!item) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Item not found in dataset",
				});
			}

			// Create listing
			const [newListing] = await db
				.insert(listing)
				.values({
					id: nanoid(),
					sellerId: userId,
					itemId: input.itemId,
					attributes: input.attributes,
					price: input.price,
					currency: input.currency,
					description: input.description ?? null,
					status: "active",
				})
				.returning();

			return {
				...newListing,
				item,
			};
		}),

	update: protectedProcedure
		.input(updateListingSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const existingListing = await db.query.listing.findFirst({
				where: eq(listing.id, input.id),
			});

			if (!existingListing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Listing not found",
				});
			}

			if (existingListing.sellerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to edit this listing",
				});
			}

			if (existingListing.status !== "active") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot edit non-active listing",
				});
			}

			// Update only allowed fields (price, description) - itemId cannot change
			const [updatedListing] = await db
				.update(listing)
				.set({
					price: input.price ?? existingListing.price,
					description: input.description ?? existingListing.description,
					lastInteractionAt: new Date(),
				})
				.where(eq(listing.id, input.id))
				.returning();

			return updatedListing;
		}),

	delete: protectedProcedure
		.input(listingIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const existingListing = await db.query.listing.findFirst({
				where: eq(listing.id, input.id),
			});

			if (!existingListing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Listing not found",
				});
			}

			if (existingListing.sellerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to delete this listing",
				});
			}

			// Soft delete - set status to deleted
			await db
				.update(listing)
				.set({ status: "deleted" })
				.where(eq(listing.id, input.id));

			return { success: true, message: "Listing deleted" };
		}),

	markAsSold: protectedProcedure
		.input(listingIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const existingListing = await db.query.listing.findFirst({
				where: eq(listing.id, input.id),
			});

			if (!existingListing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Listing not found",
				});
			}

			if (existingListing.sellerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to modify this listing",
				});
			}

			if (existingListing.status !== "active") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Listing is not active",
				});
			}

			const [updatedListing] = await db
				.update(listing)
				.set({ status: "sold" })
				.where(eq(listing.id, input.id))
				.returning();

			return updatedListing;
		}),

	getById: publicProcedure.input(listingIdSchema).query(async ({ input }) => {
		const result = await db.query.listing.findFirst({
			where: eq(listing.id, input.id),
			with: {
				item: true,
				seller: true,
			},
		});

		if (!result) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Listing not found",
			});
		}

		return result;
	}),

	search: publicProcedure.input(searchListingsSchema).query(async ({ input }) => {
		const { query, currency, minPrice, maxPrice, category, sortBy, limit, cursor } = input;

		const conditions = [eq(listing.status, "active")];

		if (currency) {
			conditions.push(eq(listing.currency, currency));
		}

		if (minPrice !== undefined) {
			conditions.push(gte(listing.price, minPrice));
		}

		if (maxPrice !== undefined) {
			conditions.push(lte(listing.price, maxPrice));
		}

		let queryBuilder = db
			.select({
				listing: listing,
				item: datasetItem,
				seller: {
					id: user.id,
					name: user.name,
				},
			})
			.from(listing)
			.innerJoin(datasetItem, eq(listing.itemId, datasetItem.id))
			.innerJoin(user, eq(listing.sellerId, user.id))
			.where(and(...conditions))
			.limit(limit + 1);

		// Add text search on item name if query provided
		if (query) {
			queryBuilder = queryBuilder.where(
				and(...conditions, ilike(datasetItem.name, `%${query}%`)),
			);
		}

		// Add category filter
		if (category) {
			queryBuilder = queryBuilder.where(
				and(...conditions, eq(datasetItem.category, category)),
			);
		}

		// Apply sorting
		switch (sortBy) {
			case "price_asc":
				queryBuilder = queryBuilder.orderBy(asc(listing.price));
				break;
			case "price_desc":
				queryBuilder = queryBuilder.orderBy(desc(listing.price));
				break;
			case "date_asc":
				queryBuilder = queryBuilder.orderBy(asc(listing.createdAt));
				break;
			case "date_desc":
			default:
				queryBuilder = queryBuilder.orderBy(desc(listing.createdAt));
				break;
		}

		const results = await queryBuilder;

		const hasNextPage = results.length > limit;
		const items = hasNextPage ? results.slice(0, -1) : results;

		return {
			items: items.map((r) => ({
				...r.listing,
				item: r.item,
				seller: r.seller,
			})),
			nextCursor: hasNextPage ? items[items.length - 1]?.listing.id : undefined,
		};
	}),

	getMyListings: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const results = await db.query.listing.findMany({
			where: and(
				eq(listing.sellerId, userId),
				or(eq(listing.status, "active"), eq(listing.status, "sold")),
			),
			with: {
				item: true,
			},
			orderBy: [desc(listing.createdAt)],
		});

		return results;
	}),

	refresh: protectedProcedure
		.input(listingIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const existingListing = await db.query.listing.findFirst({
				where: eq(listing.id, input.id),
			});

			if (!existingListing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Listing not found",
				});
			}

			if (existingListing.sellerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized to refresh this listing",
				});
			}

			// Refresh listing interaction time
			const [refreshed] = await db
				.update(listing)
				.set({ lastInteractionAt: new Date() })
				.where(eq(listing.id, input.id))
				.returning();

			return refreshed;
		}),
});
