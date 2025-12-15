import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import { db } from "@padrao/db";
import { report, chatRoom, chatMessage, userProfile, listing } from "@padrao/db/schema/marketplace";
import { user } from "@padrao/db/schema/auth";
import {
	createReportSchema,
	resolveReportSchema,
	reportIdSchema,
} from "../validators/marketplace";
import { encrypt, decrypt } from "../services/encryption";
import { nanoid } from "nanoid";

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

export const reportsRouter = router({
	create: protectedProcedure
		.input(createReportSchema)
		.mutation(async ({ ctx, input }) => {
			const reporterId = ctx.session.user.id;

			// Check if user is banned
			const profile = await db.query.userProfile.findFirst({
				where: eq(userProfile.userId, reporterId),
			});

			if (profile?.isBanned) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Account suspended",
				});
			}

			// Validate target exists
			if (input.targetType === "listing") {
				const targetListing = await db.query.listing.findFirst({
					where: eq(listing.id, input.targetId),
				});
				if (!targetListing) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Target not found",
					});
				}
			} else {
				const targetUser = await db.query.user.findFirst({
					where: eq(user.id, input.targetId),
				});
				if (!targetUser) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Target not found",
					});
				}
			}

			// Check for duplicate report
			const existingReport = await db.query.report.findFirst({
				where: and(
					eq(report.reporterId, reporterId),
					eq(report.targetType, input.targetType),
					eq(report.targetId, input.targetId),
					eq(report.status, "pending"),
				),
			});

			if (existingReport) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Report already submitted",
				});
			}

			// Capture chat log snapshot if chatRoomId provided
			let encryptedChatLog: string | null = null;

			if (input.chatRoomId) {
				const room = await db.query.chatRoom.findFirst({
					where: eq(chatRoom.id, input.chatRoomId),
				});

				if (room && (room.buyerId === reporterId || room.sellerId === reporterId)) {
					// Get recent messages
					const messages = await db.query.chatMessage.findMany({
						where: eq(chatMessage.roomId, input.chatRoomId),
						orderBy: [desc(chatMessage.createdAt)],
						limit: 50,
					});

					// Decrypt and format messages for snapshot
					const decryptedMessages = messages.map((msg) => ({
						senderId: msg.senderId,
						content: decrypt(msg.encryptedContent),
						createdAt: msg.createdAt.toISOString(),
					}));

					// Encrypt the snapshot
					encryptedChatLog = encrypt(JSON.stringify(decryptedMessages));
				}
			}

			// Create report
			const [newReport] = await db
				.insert(report)
				.values({
					id: nanoid(),
					reporterId,
					targetType: input.targetType,
					targetId: input.targetId,
					reason: input.reason,
					encryptedChatLog,
					status: "pending",
				})
				.returning();

			return newReport;
		}),

	// Moderation endpoints
	getQueue: moderatorProcedure.query(async () => {
		const pendingReports = await db.query.report.findMany({
			where: eq(report.status, "pending"),
			orderBy: [desc(report.createdAt)],
		});

		return pendingReports;
	}),

	getById: moderatorProcedure.input(reportIdSchema).query(async ({ input }) => {
		const reportData = await db.query.report.findFirst({
			where: eq(report.id, input.id),
		});

		if (!reportData) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Report not found",
			});
		}

		// Decrypt chat log if present and report is pending
		let chatLog = null;
		if (reportData.encryptedChatLog && reportData.status === "pending") {
			try {
				chatLog = JSON.parse(decrypt(reportData.encryptedChatLog));
			} catch {
				chatLog = null;
			}
		}

		return {
			...reportData,
			chatLog,
		};
	}),

	resolve: moderatorProcedure
		.input(resolveReportSchema)
		.mutation(async ({ ctx, input }) => {
			const moderatorId = ctx.session.user.id;

			const reportData = await db.query.report.findFirst({
				where: eq(report.id, input.id),
			});

			if (!reportData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report not found",
				});
			}

			if (reportData.status !== "pending") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Report already resolved",
				});
			}

			// Execute action
			if (input.action === "remove_listing" && reportData.targetType === "listing") {
				await db
					.update(listing)
					.set({ status: "deleted" })
					.where(eq(listing.id, reportData.targetId));
			} else if (input.action === "ban_user") {
				const targetUserId =
					reportData.targetType === "user"
						? reportData.targetId
						: (
								await db.query.listing.findFirst({
									where: eq(listing.id, reportData.targetId),
								})
						  )?.sellerId;

				if (targetUserId) {
					await db
						.update(userProfile)
						.set({ isBanned: true })
						.where(eq(userProfile.userId, targetUserId));
				}
			}

			// Update report status
			const [resolved] = await db
				.update(report)
				.set({
					status: input.action === "dismiss" ? "dismissed" : "resolved",
					moderatorId,
					resolution: input.resolution ?? input.action,
					resolvedAt: new Date(),
				})
				.where(eq(report.id, input.id))
				.returning();

			return resolved;
		}),

	getMyReports: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const myReports = await db.query.report.findMany({
			where: eq(report.reporterId, userId),
			orderBy: [desc(report.createdAt)],
		});

		return myReports;
	}),
});
