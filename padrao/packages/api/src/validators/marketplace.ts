import { z } from "zod";

// Enums
export const currencyEnum = z.enum(["gold", "rubin"]);
export const listingStatusEnum = z.enum(["active", "sold", "archived", "deleted"]);
export const chatRoomStatusEnum = z.enum(["active", "closed"]);
export const notificationTypeEnum = z.enum([
	"new_message",
	"listing_sold",
	"listing_expiring",
	"report_action",
]);
export const notificationStatusEnum = z.enum(["pending", "delivered", "failed"]);
export const deliveryChannelEnum = z.enum(["discord", "web"]);
export const reportTargetTypeEnum = z.enum(["listing", "user"]);
export const reportReasonEnum = z.enum([
	"spam",
	"scam",
	"unrealistic_price",
	"offense",
]);
export const reportStatusEnum = z.enum(["pending", "resolved", "dismissed"]);
export const userRoleEnum = z.enum(["player", "moderator"]);

// Attribute definition schema
export const attributeDefinitionSchema = z.object({
	key: z.string().min(1),
	label: z.string().min(1),
	type: z.enum(["number", "string", "select"]),
	options: z.array(z.string()).optional(),
	required: z.boolean(),
});

// User Profile schemas
export const updateUserProfileSchema = z.object({
	discordUsername: z
		.string()
		.max(32)
		.regex(/^[a-z0-9_.]+$/, "Invalid Discord username format")
		.nullable()
		.optional(),
});

// Dataset Item schemas
export const datasetItemSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	category: z.string().min(1),
	image: z.string().url().nullable().optional(),
	attributeSchema: z.array(attributeDefinitionSchema),
});

export const importDatasetSchema = z.object({
	items: z.array(datasetItemSchema),
});

export const searchDatasetSchema = z.object({
	query: z.string().min(1).max(100),
	limit: z.number().int().min(1).max(50).default(10),
});

// Listing schemas
export const createListingSchema = z.object({
	itemId: z.string().min(1),
	attributes: z.record(z.unknown()),
	price: z
		.number()
		.int()
		.positive()
		.max(999999999999, "Price exceeds maximum allowed"),
	currency: currencyEnum,
	description: z.string().max(1000).nullable().optional(),
});

export const updateListingSchema = z.object({
	id: z.string().min(1),
	price: z
		.number()
		.int()
		.positive()
		.max(999999999999, "Price exceeds maximum allowed")
		.optional(),
	description: z.string().max(1000).nullable().optional(),
});

export const searchListingsSchema = z.object({
	query: z.string().max(100).optional(),
	currency: currencyEnum.optional(),
	minPrice: z.number().int().min(0).optional(),
	maxPrice: z.number().int().positive().optional(),
	category: z.string().optional(),
	sortBy: z.enum(["price_asc", "price_desc", "date_asc", "date_desc"]).default("date_desc"),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(50).default(20),
});

export const listingIdSchema = z.object({
	id: z.string().min(1),
});

// Chat schemas
export const createChatRoomSchema = z.object({
	listingId: z.string().min(1),
});

export const sendMessageSchema = z.object({
	roomId: z.string().min(1),
	content: z.string().min(1).max(2000),
});

export const getMessagesSchema = z.object({
	roomId: z.string().min(1),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(50),
});

export const chatRoomIdSchema = z.object({
	roomId: z.string().min(1),
});

// Notification schemas
export const getNotificationsSchema = z.object({
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(50).default(20),
});

export const markNotificationReadSchema = z.object({
	id: z.string().min(1),
});

// Report schemas
export const createReportSchema = z.object({
	targetType: reportTargetTypeEnum,
	targetId: z.string().min(1),
	reason: reportReasonEnum,
	chatRoomId: z.string().optional(),
});

export const resolveReportSchema = z.object({
	id: z.string().min(1),
	action: z.enum(["dismiss", "remove_listing", "ban_user"]),
	resolution: z.string().max(500).optional(),
});

export const reportIdSchema = z.object({
	id: z.string().min(1),
});

// Moderation schemas
export const banUserSchema = z.object({
	userId: z.string().min(1),
	reason: z.string().max(500).optional(),
});

// Inferred types
export type Currency = z.infer<typeof currencyEnum>;
export type ListingStatus = z.infer<typeof listingStatusEnum>;
export type ChatRoomStatus = z.infer<typeof chatRoomStatusEnum>;
export type NotificationType = z.infer<typeof notificationTypeEnum>;
export type NotificationStatus = z.infer<typeof notificationStatusEnum>;
export type DeliveryChannel = z.infer<typeof deliveryChannelEnum>;
export type ReportTargetType = z.infer<typeof reportTargetTypeEnum>;
export type ReportReason = z.infer<typeof reportReasonEnum>;
export type ReportStatus = z.infer<typeof reportStatusEnum>;
export type UserRole = z.infer<typeof userRoleEnum>;

export type AttributeDefinition = z.infer<typeof attributeDefinitionSchema>;
export type DatasetItem = z.infer<typeof datasetItemSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
