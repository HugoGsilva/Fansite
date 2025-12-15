import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import { db } from "@padrao/db";
import { userProfile } from "@padrao/db/schema/marketplace";
import { updateUserProfileSchema } from "../validators/marketplace";

export const profileRouter = router({
	get: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const profile = await db.query.userProfile.findFirst({
			where: eq(userProfile.userId, userId),
		});

		if (!profile) {
			// Create default profile if it doesn't exist
			const [newProfile] = await db
				.insert(userProfile)
				.values({
					userId,
					role: "player",
					isBanned: false,
				})
				.returning();

			return {
				...ctx.session.user,
				discordUsername: newProfile.discordUsername,
				role: newProfile.role,
				isBanned: newProfile.isBanned,
			};
		}

		return {
			...ctx.session.user,
			discordUsername: profile.discordUsername,
			role: profile.role,
			isBanned: profile.isBanned,
		};
	}),

	update: protectedProcedure
		.input(updateUserProfileSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Check if profile exists
			const existingProfile = await db.query.userProfile.findFirst({
				where: eq(userProfile.userId, userId),
			});

			if (!existingProfile) {
				// Create profile with the provided data
				const [newProfile] = await db
					.insert(userProfile)
					.values({
						userId,
						discordUsername: input.discordUsername ?? null,
						role: "player",
						isBanned: false,
					})
					.returning();

				return {
					discordUsername: newProfile.discordUsername,
					role: newProfile.role,
					showDiscordAlert: !!input.discordUsername,
				};
			}

			// Update existing profile
			const [updatedProfile] = await db
				.update(userProfile)
				.set({
					discordUsername: input.discordUsername ?? existingProfile.discordUsername,
				})
				.where(eq(userProfile.userId, userId))
				.returning();

			return {
				discordUsername: updatedProfile.discordUsername,
				role: updatedProfile.role,
				showDiscordAlert:
					!!input.discordUsername &&
					input.discordUsername !== existingProfile.discordUsername,
			};
		}),

	getDiscordAlert: protectedProcedure.query(() => {
		return {
			message:
				"Para receber notificações via Discord, certifique-se de habilitar DMs de membros do servidor oficial do RubinMarket.",
		};
	}),
});
