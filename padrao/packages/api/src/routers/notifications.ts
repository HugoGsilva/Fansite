import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import { db } from "@padrao/db";
import { notification } from "@padrao/db/schema/marketplace";
import { markNotificationReadSchema, getNotificationsSchema } from "../validators/marketplace";
import { nanoid } from "nanoid";
import { z } from "zod";

export const notificationsRouter = router({
	getAll: protectedProcedure.input(getNotificationsSchema).query(async ({ ctx, input }) => {
		const userId = ctx.session.user.id;

		const notifications = await db.query.notification.findMany({
			where: eq(notification.userId, userId),
			orderBy: [desc(notification.createdAt)],
			limit: input.limit + 1,
		});

		const hasNextPage = notifications.length > input.limit;
		const items = hasNextPage ? notifications.slice(0, -1) : notifications;

		return {
			notifications: items,
			nextCursor: hasNextPage ? items[items.length - 1]?.id : undefined,
		};
	}),

	getUnread: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const unread = await db.query.notification.findMany({
			where: and(
				eq(notification.userId, userId),
				eq(notification.status, "pending"),
			),
			orderBy: [desc(notification.createdAt)],
		});

		return {
			notifications: unread,
			count: unread.length,
		};
	}),

	markAsRead: protectedProcedure
		.input(markNotificationReadSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const notif = await db.query.notification.findFirst({
				where: eq(notification.id, input.id),
			});

			if (!notif) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notification not found",
				});
			}

			if (notif.userId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorized",
				});
			}

			const [updated] = await db
				.update(notification)
				.set({ status: "delivered", deliveredVia: "web" })
				.where(eq(notification.id, input.id))
				.returning();

			return updated;
		}),

	markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		await db
			.update(notification)
			.set({ status: "delivered", deliveredVia: "web" })
			.where(
				and(eq(notification.userId, userId), eq(notification.status, "pending")),
			);

		return { success: true };
	}),

	create: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				type: z.enum(["new_message", "listing_sold", "listing_expiring", "report_action"]),
				payload: z.record(z.unknown()),
			}),
		)
		.mutation(async ({ input }) => {
			const [newNotification] = await db
				.insert(notification)
				.values({
					id: nanoid(),
					userId: input.userId,
					type: input.type,
					payload: input.payload,
					status: "pending",
				})
				.returning();

			return newNotification;
		}),
});

// Service function to queue notifications (for use in other modules)
export async function queueNotification(
	userId: string,
	type: "new_message" | "listing_sold" | "listing_expiring" | "report_action",
	payload: Record<string, unknown>,
) {
	const [newNotification] = await db
		.insert(notification)
		.values({
			id: nanoid(),
			userId,
			type,
			payload,
			status: "pending",
		})
		.returning();

	return newNotification;
}

// Service function to mark notification as delivered via Discord
export async function markDeliveredViaDiscord(notificationId: string) {
	const [updated] = await db
		.update(notification)
		.set({ status: "delivered", deliveredVia: "discord" })
		.where(eq(notification.id, notificationId))
		.returning();

	return updated;
}

// Service function to mark notification as failed (will fallback to web)
export async function markNotificationFailed(notificationId: string) {
	const [updated] = await db
		.update(notification)
		.set({ status: "failed" })
		.where(eq(notification.id, notificationId))
		.returning();

	return updated;
}
