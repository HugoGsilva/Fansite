import { TRPCError } from "@trpc/server";
import { eq, ilike, sql } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../index";
import { db } from "@padrao/db";
import { datasetItem, userProfile } from "@padrao/db/schema/marketplace";
import {
	searchDatasetSchema,
	importDatasetSchema,
	datasetItemSchema,
} from "../validators/marketplace";
import { z } from "zod";

const moderatorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const profile = await db.query.userProfile.findFirst({
		where: eq(userProfile.userId, ctx.session.user.id),
	});

	if (profile?.role !== "moderator") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Moderator access required",
		});
	}

	return next({ ctx });
});

export const datasetRouter = router({
	search: publicProcedure.input(searchDatasetSchema).query(async ({ input }) => {
		const { query, limit } = input;

		const results = await db
			.select()
			.from(datasetItem)
			.where(ilike(datasetItem.name, `%${query}%`))
			.limit(limit)
			.orderBy(datasetItem.name);

		return results;
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ input }) => {
			const item = await db.query.datasetItem.findFirst({
				where: eq(datasetItem.id, input.id),
			});

			if (!item) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Item not found in dataset",
				});
			}

			return item;
		}),

	getByCategory: publicProcedure
		.input(z.object({ category: z.string().min(1), limit: z.number().int().min(1).max(100).default(50) }))
		.query(async ({ input }) => {
			const results = await db
				.select()
				.from(datasetItem)
				.where(eq(datasetItem.category, input.category))
				.limit(input.limit)
				.orderBy(datasetItem.name);

			return results;
		}),

	getCategories: publicProcedure.query(async () => {
		const categories = await db
			.selectDistinct({ category: datasetItem.category })
			.from(datasetItem)
			.orderBy(datasetItem.category);

		return categories.map((c) => c.category);
	}),

	import: moderatorProcedure
		.input(importDatasetSchema)
		.mutation(async ({ input }) => {
			const { items } = input;

			if (items.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No items to import",
				});
			}

			// Upsert items - insert new ones, update existing ones
			const insertedCount = await db.transaction(async (tx) => {
				let count = 0;

				for (const item of items) {
					const existing = await tx.query.datasetItem.findFirst({
						where: eq(datasetItem.id, item.id),
					});

					if (existing) {
						await tx
							.update(datasetItem)
							.set({
								name: item.name,
								category: item.category,
								image: item.image ?? null,
								attributeSchema: item.attributeSchema,
								updatedAt: new Date(),
							})
							.where(eq(datasetItem.id, item.id));
					} else {
						await tx.insert(datasetItem).values({
							id: item.id,
							name: item.name,
							category: item.category,
							image: item.image ?? null,
							attributeSchema: item.attributeSchema,
						});
					}
					count++;
				}

				return count;
			});

			return {
				success: true,
				importedCount: insertedCount,
				message: `Successfully imported ${insertedCount} items`,
			};
		}),

	count: publicProcedure.query(async () => {
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(datasetItem);

		return { count: Number(result[0]?.count ?? 0) };
	}),
});
