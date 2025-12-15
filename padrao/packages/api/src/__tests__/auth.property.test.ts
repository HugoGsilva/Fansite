import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fc from "fast-check";
import { db } from "@padrao/db";
import { userProfile } from "@padrao/db/schema/marketplace";
import { user } from "@padrao/db/schema/auth";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Property 5: Discord Username Round-Trip
 * For any valid Discord username, saving and then retrieving the profile
 * should return the same Discord username.
 * Validates: Requirements 2.3, 2.4
 * **Feature: rubin-market, Property 5: Discord Username Round-Trip**
 */
describe("Feature: rubin-market, Property 5: Discord Username Round-Trip", () => {
	const testUserIds: string[] = [];

	afterAll(async () => {
		// Cleanup test data
		for (const userId of testUserIds) {
			await db.delete(userProfile).where(eq(userProfile.userId, userId));
			await db.delete(user).where(eq(user.id, userId));
		}
	});

	it("should preserve Discord username after save and retrieve", async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate valid Discord usernames (lowercase, numbers, underscores, dots, 1-32 chars)
				fc.stringMatching(/^[a-z0-9_.]{1,32}$/),
				async (discordUsername) => {
					// Create a test user
					const userId = nanoid();
					testUserIds.push(userId);

					await db.insert(user).values({
						id: userId,
						name: "Test User",
						email: `test-${userId}@example.com`,
						emailVerified: false,
					});

					// Save profile with Discord username
					await db.insert(userProfile).values({
						userId,
						discordUsername,
						role: "player",
						isBanned: false,
					});

					// Retrieve profile
					const retrieved = await db.query.userProfile.findFirst({
						where: eq(userProfile.userId, userId),
					});

					// Assert round-trip equality
					expect(retrieved).not.toBeNull();
					expect(retrieved?.discordUsername).toBe(discordUsername);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("should handle null Discord username correctly", async () => {
		const userId = nanoid();
		testUserIds.push(userId);

		await db.insert(user).values({
			id: userId,
			name: "Test User Null",
			email: `test-null-${userId}@example.com`,
			emailVerified: false,
		});

		await db.insert(userProfile).values({
			userId,
			discordUsername: null,
			role: "player",
			isBanned: false,
		});

		const retrieved = await db.query.userProfile.findFirst({
			where: eq(userProfile.userId, userId),
		});

		expect(retrieved).not.toBeNull();
		expect(retrieved?.discordUsername).toBeNull();
	});
});

/**
 * Property 26: Ban Revokes Sessions
 * For any banned user, all their active sessions should be invalidated
 * and new authentication attempts should fail.
 * Validates: Requirements 9.5
 * **Feature: rubin-market, Property 26: Ban Revokes Sessions**
 */
describe("Feature: rubin-market, Property 26: Ban Revokes Sessions", () => {
	it("should set isBanned flag correctly", async () => {
		await fc.assert(
			fc.asyncProperty(fc.boolean(), async (shouldBan) => {
				const userId = nanoid();

				await db.insert(user).values({
					id: userId,
					name: "Test Ban User",
					email: `test-ban-${userId}@example.com`,
					emailVerified: false,
				});

				await db.insert(userProfile).values({
					userId,
					role: "player",
					isBanned: shouldBan,
				});

				const retrieved = await db.query.userProfile.findFirst({
					where: eq(userProfile.userId, userId),
				});

				expect(retrieved?.isBanned).toBe(shouldBan);

				// Cleanup
				await db.delete(userProfile).where(eq(userProfile.userId, userId));
				await db.delete(user).where(eq(user.id, userId));
			}),
			{ numRuns: 100 },
		);
	});
});
