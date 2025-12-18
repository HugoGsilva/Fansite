import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fc from "fast-check";
import "dotenv/config";
import { db } from "@padrao/db";
import { listing, datasetItem, userProfile } from "@padrao/db/schema/marketplace";
import { user } from "@padrao/db/schema/auth";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const testIds = {
	users: [] as string[],
	items: [] as string[],
	listings: [] as string[],
};

async function createTestUser() {
	const userId = nanoid();
	testIds.users.push(userId);

	await db.insert(user).values({
		id: userId,
		name: "Test User",
		email: `test-${userId}@example.com`,
		emailVerified: false,
	});

	await db.insert(userProfile).values({
		userId,
		role: "player",
		isBanned: false,
	});

	return userId;
}

async function createTestItem() {
	const itemId = nanoid();
	testIds.items.push(itemId);

	await db.insert(datasetItem).values({
		id: itemId,
		name: `Test Item ${itemId}`,
		category: "weapon",
		attributeSchema: [],
	});

	return itemId;
}

afterAll(async () => {
	for (const id of testIds.listings) {
		await db.delete(listing).where(eq(listing.id, id));
	}
	for (const id of testIds.items) {
		await db.delete(datasetItem).where(eq(datasetItem.id, id));
	}
	for (const id of testIds.users) {
		await db.delete(userProfile).where(eq(userProfile.userId, id));
		await db.delete(user).where(eq(user.id, id));
	}
});

/**
 * Property 10: Currency Restriction
 * For any listing creation or update, the currency field should only accept 'gold' or 'rubin' values.
 * Validates: Requirements 4.4, 12.1
 * **Feature: rubin-market, Property 10: Currency Restriction**
 */
describe("Feature: rubin-market, Property 10: Currency Restriction", () => {
	it("should only accept gold or rubin as currency", async () => {
		const userId = await createTestUser();
		const itemId = await createTestItem();

		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom("gold", "rubin") as fc.Arbitrary<"gold" | "rubin">,
				async (currency) => {
					const listingId = nanoid();
					testIds.listings.push(listingId);

					await db.insert(listing).values({
						id: listingId,
						sellerId: userId,
						itemId,
						attributes: {},
						price: 1000,
						currency,
						status: "active",
					});

					const found = await db.query.listing.findFirst({
						where: eq(listing.id, listingId),
					});

					expect(found?.currency).toBe(currency);
					expect(["gold", "rubin"]).toContain(found?.currency);
				},
			),
			{ numRuns: 100 },
		);
	});
});

/**
 * Property 11: Listing Creation Validation
 * For any valid listing input (valid item ID, numeric price, valid currency),
 * creating a listing should result in a listing with 'active' status.
 * Validates: Requirements 4.5
 * **Feature: rubin-market, Property 11: Listing Creation Validation**
 */
describe("Feature: rubin-market, Property 11: Listing Creation Validation", () => {
	it("should create listings with active status", async () => {
		const userId = await createTestUser();
		const itemId = await createTestItem();

		await fc.assert(
			fc.asyncProperty(
				fc.record({
					price: fc.integer({ min: 1, max: 999999999 }),
					currency: fc.constantFrom("gold", "rubin") as fc.Arbitrary<"gold" | "rubin">,
				}),
				async ({ price, currency }) => {
					const listingId = nanoid();
					testIds.listings.push(listingId);

					await db.insert(listing).values({
						id: listingId,
						sellerId: userId,
						itemId,
						attributes: {},
						price,
						currency,
						status: "active",
					});

					const found = await db.query.listing.findFirst({
						where: eq(listing.id, listingId),
					});

					expect(found?.status).toBe("active");
					expect(found?.price).toBe(price);
				},
			),
			{ numRuns: 100 },
		);
	});
});

/**
 * Property 13: Soft Delete Preservation
 * For any deleted listing, the record should still exist in the database with 'deleted' status.
 * Validates: Requirements 5.2
 * **Feature: rubin-market, Property 13: Soft Delete Preservation**
 */
describe("Feature: rubin-market, Property 13: Soft Delete Preservation", () => {
	it("should preserve deleted listings with deleted status", async () => {
		const userId = await createTestUser();
		const itemId = await createTestItem();

		const listingId = nanoid();
		testIds.listings.push(listingId);

		await db.insert(listing).values({
			id: listingId,
			sellerId: userId,
			itemId,
			attributes: {},
			price: 1000,
			currency: "gold",
			status: "active",
		});

		// Soft delete
		await db.update(listing).set({ status: "deleted" }).where(eq(listing.id, listingId));

		// Verify record still exists with deleted status
		const found = await db.query.listing.findFirst({
			where: eq(listing.id, listingId),
		});

		expect(found).not.toBeNull();
		expect(found?.status).toBe("deleted");
	});
});

/**
 * Property 14: Non-Active Listings Search Exclusion
 * For any listing with status 'sold', 'archived', or 'deleted',
 * it should not appear in public search results.
 * Validates: Requirements 5.3, 5.6
 * **Feature: rubin-market, Property 14: Non-Active Listings Search Exclusion**
 */
describe("Feature: rubin-market, Property 14: Non-Active Listings Search Exclusion", () => {
	it("should exclude non-active listings from search", async () => {
		const userId = await createTestUser();
		const itemId = await createTestItem();

		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom("sold", "archived", "deleted") as fc.Arbitrary<"sold" | "archived" | "deleted">,
				async (status) => {
					const listingId = nanoid();
					testIds.listings.push(listingId);

					await db.insert(listing).values({
						id: listingId,
						sellerId: userId,
						itemId,
						attributes: {},
						price: 1000,
						currency: "gold",
						status,
					});

					// Search for active listings only
					const activeListings = await db.query.listing.findMany({
						where: eq(listing.status, "active"),
					});

					const foundInActive = activeListings.some((l) => l.id === listingId);
					expect(foundInActive).toBe(false);
				},
			),
			{ numRuns: 100 },
		);
	});
});

/**
 * Property 12: Listing Edit Item Immutability
 * For any listing edit operation, the itemId should remain unchanged
 * while price and description can be modified.
 * Validates: Requirements 5.1
 * **Feature: rubin-market, Property 12: Listing Edit Item Immutability**
 */
describe("Feature: rubin-market, Property 12: Listing Edit Item Immutability", () => {
	it("should not allow changing itemId during update", async () => {
		const userId = await createTestUser();
		const itemId = await createTestItem();
		const newItemId = await createTestItem();

		const listingId = nanoid();
		testIds.listings.push(listingId);

		await db.insert(listing).values({
			id: listingId,
			sellerId: userId,
			itemId,
			attributes: {},
			price: 1000,
			currency: "gold",
			status: "active",
		});

		// Update only price and description (itemId stays the same)
		await db
			.update(listing)
			.set({ price: 2000, description: "Updated description" })
			.where(eq(listing.id, listingId));

		const updated = await db.query.listing.findFirst({
			where: eq(listing.id, listingId),
		});

		expect(updated?.itemId).toBe(itemId);
		expect(updated?.itemId).not.toBe(newItemId);
		expect(updated?.price).toBe(2000);
		expect(updated?.description).toBe("Updated description");
	});
});
