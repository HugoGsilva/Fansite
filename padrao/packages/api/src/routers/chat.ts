import { TRPCError } from "@trpc/server";
import { eq, and, or, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../index";
import { db } from "@padrao/db";
import { chatRoom, chatMessage, listing, userProfile } from "@padrao/db/schema/marketplace";
import { user } from "@padrao/db/schema/auth";
import {
	createChatRoomSchema,
	sendMessageSchema,
	getMessagesSchema,
	chatRoomIdSchema,
} from "../validators/marketplace";
import { encrypt, decrypt } from "../services/encryption";
import { nanoid } from "nanoid";

export const chatRouter = router({
	createRoom: protectedProcedure
		.input(createChatRoomSchema)
		.mutation(async ({ ctx, input }) => {
			const buyerId = ctx.session.user.id;

			// Check if user is banned
			const profile = await db.query.userProfile.findFirst({
				where: eq(userProfile.userId, buyerId),
			});

			if (profile?.isBanned) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Account suspended",
				});
			}

			// Get the listing
			const targetListing = await db.query.listing.findFirst({
				where: eq(listing.id, input.listingId),
			});

			if (!targetListing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Listing not found",
				});
			}

			if (targetListing.status !== "active") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Listing is not active",
				});
			}

			// Prevent self-negotiation
			if (targetListing.sellerId === buyerId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Cannot negotiate on your own listing",
				});
			}

			// Check if room already exists
			const existingRoom = await db.query.chatRoom.findFirst({
				where: and(
					eq(chatRoom.listingId, input.listingId),
					eq(chatRoom.buyerId, buyerId),
				),
			});

			if (existingRoom) {
				return existingRoom;
			}

			// Create new chat room
			const [newRoom] = await db
				.insert(chatRoom)
				.values({
					id: nanoid(),
					listingId: input.listingId,
					buyerId,
					sellerId: targetListing.sellerId,
					status: "active",
				})
				.returning();

			// Update listing interaction time
			await db
				.update(listing)
				.set({ lastInteractionAt: new Date() })
				.where(eq(listing.id, input.listingId));

			return newRoom;
		}),

	sendMessage: protectedProcedure
		.input(sendMessageSchema)
		.mutation(async ({ ctx, input }) => {
			const senderId = ctx.session.user.id;

			// Get the room
			const room = await db.query.chatRoom.findFirst({
				where: eq(chatRoom.id, input.roomId),
			});

			if (!room) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat room not found",
				});
			}

			// Verify sender is a participant
			if (room.buyerId !== senderId && room.sellerId !== senderId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a participant of this chat",
				});
			}

			if (room.status !== "active") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Chat room is closed",
				});
			}

			// Encrypt message content
			const encryptedContent = encrypt(input.content);

			// Create message
			const [newMessage] = await db
				.insert(chatMessage)
				.values({
					id: nanoid(),
					roomId: input.roomId,
					senderId,
					encryptedContent,
				})
				.returning();

			// Update room interaction time
			await db
				.update(chatRoom)
				.set({ updatedAt: new Date() })
				.where(eq(chatRoom.id, input.roomId));

			return {
				id: newMessage.id,
				roomId: newMessage.roomId,
				senderId: newMessage.senderId,
				content: input.content, // Return plaintext to sender
				createdAt: newMessage.createdAt,
			};
		}),

	getMessages: protectedProcedure
		.input(getMessagesSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Get the room
			const room = await db.query.chatRoom.findFirst({
				where: eq(chatRoom.id, input.roomId),
			});

			if (!room) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat room not found",
				});
			}

			// Verify user is a participant
			if (room.buyerId !== userId && room.sellerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a participant of this chat",
				});
			}

			// Get messages
			const messages = await db.query.chatMessage.findMany({
				where: eq(chatMessage.roomId, input.roomId),
				orderBy: [desc(chatMessage.createdAt)],
				limit: input.limit + 1,
			});

			const hasNextPage = messages.length > input.limit;
			const items = hasNextPage ? messages.slice(0, -1) : messages;

			// Decrypt messages
			const decryptedMessages = items.map((msg) => ({
				id: msg.id,
				roomId: msg.roomId,
				senderId: msg.senderId,
				content: decrypt(msg.encryptedContent),
				createdAt: msg.createdAt,
			}));

			return {
				messages: decryptedMessages.reverse(), // Return in chronological order
				nextCursor: hasNextPage ? items[items.length - 1]?.id : undefined,
			};
		}),

	getRoom: protectedProcedure
		.input(chatRoomIdSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const room = await db.query.chatRoom.findFirst({
				where: eq(chatRoom.id, input.roomId),
				with: {
					listing: {
						with: {
							item: true,
						},
					},
					buyer: true,
					seller: true,
				},
			});

			if (!room) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat room not found",
				});
			}

			if (room.buyerId !== userId && room.sellerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a participant of this chat",
				});
			}

			return room;
		}),

	getMyRooms: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const rooms = await db.query.chatRoom.findMany({
			where: or(eq(chatRoom.buyerId, userId), eq(chatRoom.sellerId, userId)),
			with: {
				listing: {
					with: {
						item: true,
					},
				},
				buyer: true,
				seller: true,
			},
			orderBy: [desc(chatRoom.updatedAt)],
		});

		return rooms;
	}),

	closeRoom: protectedProcedure
		.input(chatRoomIdSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const room = await db.query.chatRoom.findFirst({
				where: eq(chatRoom.id, input.roomId),
			});

			if (!room) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Chat room not found",
				});
			}

			// Only seller can close the room
			if (room.sellerId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the seller can close the chat",
				});
			}

			const [closedRoom] = await db
				.update(chatRoom)
				.set({ status: "closed" })
				.where(eq(chatRoom.id, input.roomId))
				.returning();

			return closedRoom;
		}),

	getRmtWarning: protectedProcedure.query(() => {
		return {
			message:
				"⚠️ ATENÇÃO: É proibido negociar itens por dinheiro real (RMT). Todas as transações devem ser feitas utilizando apenas moedas do jogo (Gold Coins ou Rubin Coins). Violações resultarão em banimento permanente.",
		};
	}),
});
