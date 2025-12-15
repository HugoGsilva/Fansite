import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import { db } from "@padrao/db";
import { userProfile, session } from "@padrao/db/schema";
import { banUserSchema } from "../validators/marketplace";

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

export const moderationRouter = router({
	banUser: moderatorProcedure
		.input(banUserSchema)
		.mutation(async ({ input }) => {
			const { userId } = input;

			// Check if user exists
			const targetProfile = await db.query.userProfile.findFirst({
				where: eq(userProfile.userId, userId),
			});

			if (!targetProfile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			if (targetProfile.isBanned) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User is already banned",
				});
			}

			// Ban user - set isBanned flag
			await db
				.update(userProfile)
				.set({ isBanned: true })
				.where(eq(userProfile.userId, userId));

			// Revoke all active sessions for the banned user
			await db.delete(session).where(eq(session.userId, userId));

			return {
				success: true,
				message: "User banned and all sessions revoked",
			};
		}),

	unbanUser: moderatorProcedure
		.input(banUserSchema)
		.mutation(async ({ input }) => {
			const { userId } = input;

			const targetProfile = await db.query.userProfile.findFirst({
				where: eq(userProfile.userId, userId),
			});

			if (!targetProfile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			if (!targetProfile.isBanned) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User is not banned",
				});
			}

			await db
				.update(userProfile)
				.set({ isBanned: false })
				.where(eq(userProfile.userId, userId));

			return {
				success: true,
				message: "User unbanned",
			};
		}),

	checkBanStatus: protectedProcedure.query(async ({ ctx }) => {
		const profile = await db.query.userProfile.findFirst({
			where: eq(userProfile.userId, ctx.session.user.id),
		});

		return {
			isBanned: profile?.isBanned ?? false,
		};
	}),
});
