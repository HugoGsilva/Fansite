import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// User Profile extension - adds marketplace-specific fields
export const userProfile = pgTable("user_profile", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	discordUsername: text("discord_username"),
	role: text("role", { enum: ["player", "moderator"] })
		.default("player")
		.notNull(),
	isBanned: boolean("is_banned").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

// Attribute definition type for dataset items
export interface AttributeDefinition {
	key: string;
	label: string;
	type: "number" | "string" | "select";
	options?: string[];
	required: boolean;
}

// Dataset items catalog
export const datasetItem = pgTable(
	"dataset_item",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		category: text("category").notNull(),
		image: text("image"),
		attributeSchema: jsonb("attribute_schema")
			.notNull()
			.$type<AttributeDefinition[]>(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("dataset_item_name_idx").on(table.name),
		index("dataset_item_category_idx").on(table.category),
	],
);

// Listings
export const listing = pgTable(
	"listing",
	{
		id: text("id").primaryKey(),
		sellerId: text("seller_id")
			.notNull()
			.references(() => user.id),
		itemId: text("item_id")
			.notNull()
			.references(() => datasetItem.id),
		attributes: jsonb("attributes").notNull().$type<Record<string, unknown>>(),
		price: integer("price").notNull(),
		currency: text("currency", { enum: ["gold", "rubin"] }).notNull(),
		description: text("description"),
		status: text("status", {
			enum: ["active", "sold", "archived", "deleted"],
		})
			.default("active")
			.notNull(),
		lastInteractionAt: timestamp("last_interaction_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("listing_seller_idx").on(table.sellerId),
		index("listing_status_idx").on(table.status),
		index("listing_item_idx").on(table.itemId),
	],
);

// Chat rooms
export const chatRoom = pgTable(
	"chat_room",
	{
		id: text("id").primaryKey(),
		listingId: text("listing_id")
			.notNull()
			.references(() => listing.id),
		buyerId: text("buyer_id")
			.notNull()
			.references(() => user.id),
		sellerId: text("seller_id")
			.notNull()
			.references(() => user.id),
		status: text("status", { enum: ["active", "closed"] })
			.default("active")
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("chat_room_buyer_idx").on(table.buyerId),
		index("chat_room_seller_idx").on(table.sellerId),
		index("chat_room_listing_idx").on(table.listingId),
	],
);

// Chat messages (encrypted content)
export const chatMessage = pgTable(
	"chat_message",
	{
		id: text("id").primaryKey(),
		roomId: text("room_id")
			.notNull()
			.references(() => chatRoom.id),
		senderId: text("sender_id")
			.notNull()
			.references(() => user.id),
		encryptedContent: text("encrypted_content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("chat_message_room_idx").on(table.roomId),
		index("chat_message_created_idx").on(table.createdAt),
	],
);

// Notifications
export const notification = pgTable(
	"notification",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		type: text("type", {
			enum: ["new_message", "listing_sold", "listing_expiring", "report_action"],
		}).notNull(),
		payload: jsonb("payload").notNull(),
		deliveredVia: text("delivered_via", { enum: ["discord", "web"] }),
		status: text("status", { enum: ["pending", "delivered", "failed"] })
			.default("pending")
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("notification_user_idx").on(table.userId),
		index("notification_status_idx").on(table.status),
	],
);

// Reports
export const report = pgTable(
	"report",
	{
		id: text("id").primaryKey(),
		reporterId: text("reporter_id")
			.notNull()
			.references(() => user.id),
		targetType: text("target_type", { enum: ["listing", "user"] }).notNull(),
		targetId: text("target_id").notNull(),
		reason: text("reason", {
			enum: ["spam", "scam", "unrealistic_price", "offense"],
		}).notNull(),
		encryptedChatLog: text("encrypted_chat_log"),
		status: text("status", { enum: ["pending", "resolved", "dismissed"] })
			.default("pending")
			.notNull(),
		moderatorId: text("moderator_id").references(() => user.id),
		resolution: text("resolution"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		resolvedAt: timestamp("resolved_at"),
	},
	(table) => [
		index("report_status_idx").on(table.status),
		index("report_target_idx").on(table.targetType, table.targetId),
	],
);

// Relations
export const userProfileRelations = relations(userProfile, ({ one }) => ({
	user: one(user, {
		fields: [userProfile.userId],
		references: [user.id],
	}),
}));

export const datasetItemRelations = relations(datasetItem, ({ many }) => ({
	listings: many(listing),
}));

export const listingRelations = relations(listing, ({ one, many }) => ({
	seller: one(user, {
		fields: [listing.sellerId],
		references: [user.id],
	}),
	item: one(datasetItem, {
		fields: [listing.itemId],
		references: [datasetItem.id],
	}),
	chatRooms: many(chatRoom),
}));

export const chatRoomRelations = relations(chatRoom, ({ one, many }) => ({
	listing: one(listing, {
		fields: [chatRoom.listingId],
		references: [listing.id],
	}),
	buyer: one(user, {
		fields: [chatRoom.buyerId],
		references: [user.id],
		relationName: "buyer",
	}),
	seller: one(user, {
		fields: [chatRoom.sellerId],
		references: [user.id],
		relationName: "seller",
	}),
	messages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
	room: one(chatRoom, {
		fields: [chatMessage.roomId],
		references: [chatRoom.id],
	}),
	sender: one(user, {
		fields: [chatMessage.senderId],
		references: [user.id],
	}),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id],
	}),
}));

export const reportRelations = relations(report, ({ one }) => ({
	reporter: one(user, {
		fields: [report.reporterId],
		references: [user.id],
		relationName: "reporter",
	}),
	moderator: one(user, {
		fields: [report.moderatorId],
		references: [user.id],
		relationName: "moderator",
	}),
}));
