import { describe, it, expect, afterAll } from "bun:test";
import fc from "fast-check";
import { db } from "@padrao/db";
import { datasetItem } from "@padrao/db/schema/marketplace";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Property 28: Dataset Update Reflection
 * For any newly imported dataset item, it should be searchable and available
 * for listing creation immediately after import.
 * Validates: Requirements 13.2, 13.3
 * **Feature: rubin-market, Property 28: Dataset Update Reflection**
 */
describe("Feature: rubin-market, Property 28: Dataset Update Reflection", () => {
	const testItemIds: string[] = [];

	afterAll(async () => {
		// Cleanup test data
		for (const id of testItemIds) {
			await db.delete(datasetItem).where(eq(datasetItem.id, id));
		}
	});

	it("should make imported items immediately searchable", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
					category: fc.constantFrom("weapon", "armor", "accessory", "consumable", "material"),
				}),
				async ({ name, category }) => {
					const itemId = nanoid();
					testItemIds.push(itemId);

					// Import item
					await db.insert(datasetItem).values({
						id: itemId,
						name,
						category,
						image: null,
						attributeSchema: [],
					});

					// Verify it's immediately searchable
					const found = await db.query.datasetItem.findFirst({
						where: eq(datasetItem.id, itemId),
					});

					expect(found).not.toBeNull();
					expect(found?.id).toBe(itemId);
					expect(found?.name).toBe(name);
					expect(found?.category).toBe(category);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("should update existing items correctly", async () => {
		const itemId = nanoid();
		testItemIds.push(itemId);

		// Create initial item
		await db.insert(datasetItem).values({
			id: itemId,
			name: "Original Name",
			category: "weapon",
			image: null,
			attributeSchema: [],
		});

		// Update the item
		const newName = "Updated Name";
		await db
			.update(datasetItem)
			.set({ name: newName, updatedAt: new Date() })
			.where(eq(datasetItem.id, itemId));

		// Verify update
		const updated = await db.query.datasetItem.findFirst({
			where: eq(datasetItem.id, itemId),
		});

		expect(updated?.name).toBe(newName);
	});

	it("should preserve attribute schema correctly", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(
					fc.record({
						key: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
						label: fc.string({ minLength: 1, maxLength: 50 }),
						type: fc.constantFrom("number", "string", "select"),
						required: fc.boolean(),
					}),
					{ minLength: 0, maxLength: 5 },
				),
				async (attributeSchema) => {
					const itemId = nanoid();
					testItemIds.push(itemId);

					await db.insert(datasetItem).values({
						id: itemId,
						name: `Test Item ${itemId}`,
						category: "weapon",
						image: null,
						attributeSchema,
					});

					const found = await db.query.datasetItem.findFirst({
						where: eq(datasetItem.id, itemId),
					});

					expect(found?.attributeSchema).toEqual(attributeSchema);
				},
			),
			{ numRuns: 100 },
		);
	});
});
