import { db } from "@padrao/db";
import { listing, chatMessage, notification } from "@padrao/db/schema/marketplace";
import { eq, lt, and } from "drizzle-orm";
import { queueNotification } from "../routers/notifications";

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Task 13.1: Listing Expiration Cron Job
 * - 15 days without interaction: Send renewal alert
 * - 30 days without interaction: Auto-archive listing
 * Requirements: 5.4, 5.5
 */
export async function processListingExpiration() {
	const now = new Date();
	const fifteenDaysAgo = new Date(now.getTime() - FIFTEEN_DAYS_MS);
	const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

	// Find listings that need 15-day renewal alert
	const listingsNeedingAlert = await db.query.listing.findMany({
		where: and(
			eq(listing.status, "active"),
			lt(listing.lastInteractionAt, fifteenDaysAgo),
		),
	});

	// Send renewal alerts for 15-day old listings
	for (const item of listingsNeedingAlert) {
		// Check if already alerted (within last 24 hours)
		const existingAlert = await db.query.notification.findFirst({
			where: and(
				eq(notification.userId, item.sellerId),
				eq(notification.type, "listing_expiring"),
			),
		});

		if (!existingAlert) {
			await queueNotification(item.sellerId, "listing_expiring", {
				listingId: item.id,
				message: `Seu anúncio está inativo há mais de 15 dias. Renove para mantê-lo visível.`,
				daysInactive: 15,
			});
		}
	}

	// Find and archive 30-day old listings
	const listingsToArchive = await db.query.listing.findMany({
		where: and(
			eq(listing.status, "active"),
			lt(listing.lastInteractionAt, thirtyDaysAgo),
		),
	});

	for (const item of listingsToArchive) {
		await db
			.update(listing)
			.set({ status: "archived" })
			.where(eq(listing.id, item.id));

		await queueNotification(item.sellerId, "listing_expiring", {
			listingId: item.id,
			message: `Seu anúncio foi arquivado automaticamente após 30 dias de inatividade.`,
			archived: true,
		});
	}

	return {
		alertsSent: listingsNeedingAlert.length,
		listingsArchived: listingsToArchive.length,
	};
}

/**
 * Task 13.4: Chat Log Cleanup Cron Job
 * - Delete chat messages older than 90 days
 * Requirements: 12.4
 */
export async function cleanupOldChatLogs() {
	const now = new Date();
	const ninetyDaysAgo = new Date(now.getTime() - NINETY_DAYS_MS);

	const result = await db
		.delete(chatMessage)
		.where(lt(chatMessage.createdAt, ninetyDaysAgo));

	return {
		deletedCount: result.rowCount ?? 0,
	};
}

/**
 * Main cron runner - should be called by a scheduler
 */
export async function runScheduledJobs() {
	console.log("[CRON] Starting scheduled jobs...");

	try {
		const expirationResult = await processListingExpiration();
		console.log(
			`[CRON] Listing expiration: ${expirationResult.alertsSent} alerts, ${expirationResult.listingsArchived} archived`,
		);
	} catch (error) {
		console.error("[CRON] Listing expiration failed:", error);
	}

	try {
		const cleanupResult = await cleanupOldChatLogs();
		console.log(`[CRON] Chat cleanup: ${cleanupResult.deletedCount} messages deleted`);
	} catch (error) {
		console.error("[CRON] Chat cleanup failed:", error);
	}

	console.log("[CRON] Scheduled jobs complete.");
}
