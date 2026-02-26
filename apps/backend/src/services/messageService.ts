import prisma from "../lib/prisma.js";
import type { Message, Notification } from "@prisma/client";
import { getIO, connectedUsers } from "../lib/socket.js";
import { ItemService } from "./itemService.js";

export class MessageService {

    /**
     * Get all active conversations for a user.
     * Returns a grouped list of unique counterparts with the latest message snippet.
     */
    static async getConversations(userId: string) {
        // Fetch all messages involving the user
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                receiver: { select: { id: true, name: true, image: true } },
                item: { select: { id: true, title: true, images: true, price: true, sellerId: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by conversation partner and item
        const conversationsMap = new Map<string, any>();

        for (const msg of messages) {
            const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            const partner = msg.senderId === userId ? msg.receiver : msg.sender;

            // Unique thread identified by Partner ID AND Item ID (if tied to an item)
            // If itemId is null, it's a general thread, but we expect item-specific threads for this platform
            const threadKey = `${partnerId}-${msg.itemId || 'general'}`;

            if (!conversationsMap.has(threadKey)) {
                conversationsMap.set(threadKey, {
                    partnerId: partner.id,
                    partnerName: partner.name,
                    partnerImage: partner.image,
                    item: msg.item,
                    latestMessage: msg.content,
                    latestMessageAt: msg.createdAt,
                    latestMessageType: msg.type,
                    latestOfferPrice: msg.offerPrice,
                    latestOfferStatus: msg.offerStatus,
                    unreadCount: 0
                });
            }

            // Increment unread count if we are the receiver and it's unread
            if (msg.receiverId === userId && !msg.isRead) {
                conversationsMap.get(threadKey).unreadCount += 1;
            }
        }

        return Array.from(conversationsMap.values());
    }

    /**
     * Get message history between current user and a partner, optionally filtered by item.
     */
    static async getMessages(userId: string, partnerId: string, itemId?: string) {
        const whereClause: any = {
            OR: [
                { senderId: userId, receiverId: partnerId },
                { senderId: partnerId, receiverId: userId }
            ]
        };

        if (itemId) {
            whereClause.itemId = itemId;
        }

        const messages = await prisma.message.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { id: true, name: true, image: true } }
            }
        });

        return messages;
    }

    /**
     * Mark a set of messages as read
     */
    static async markAsRead(userId: string, messageIds: string[]) {
        if (!messageIds || messageIds.length === 0) return 0;

        const result = await prisma.message.updateMany({
            where: {
                id: { in: messageIds },
                receiverId: userId, // Ensure we only mark messages meant for us
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        return result.count;
    }

    /**
     * Send a new message, trigger WebSocket events, and generate offline notifications if necessary.
     */
    static async sendMessage(senderId: string, receiverId: string, content: string, itemId?: string) {
        // 1. Validation for restricted content (emails/phones)
        if (ItemService.hasRestrictedContent(content)) {
            throw new Error("Validation Error: Emails and phone numbers are not allowed in messages for security reasons.");
        }

        // 2. Persist message
        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId,
                content,
                itemId: itemId || null
            },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                item: { select: { id: true, title: true, sellerId: true, status: true } }
            }
        });

        // 3. Dispatch Live WebSocket Event
        const io = getIO();
        const receiverSockets = connectedUsers.get(receiverId);

        if (receiverSockets && receiverSockets.size > 0) {
            // Receiver is online, send live socket emission
            receiverSockets.forEach(socketId => {
                io.to(socketId).emit("receive_message", message);
            });
        } else {
            // Receiver is offline, create a persistent database Notification
            await prisma.notification.create({
                data: {
                    userId: receiverId,
                    type: "MESSAGE",
                    content: `Vous avez reçu un nouveau message de ${message.sender.name}${message.item ? ` à propos de ${message.item.title}` : ""}.`
                }
            });
        }

        return message;
    }

    /**
     * Sends a new Offer
     */
    static async sendOffer(senderId: string, receiverId: string, itemId: string, offerPrice: number) {
        // Validate item exists and matches seller
        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (!item) throw new Error("Item not found");
        if (item.sellerId !== receiverId && item.sellerId !== senderId) {
            throw new Error("Invalid offer participants");
        }
        if (item.status !== "APPROVED" && item.status !== "PENDING") { // Could be sold already
            throw new Error("This item is not available for offers.");
        }
        if (offerPrice <= 0) throw new Error("L'offre doit être supérieure à 0.");

        // Check if there's already a pending offer from this user for this item to avoid spam
        const existingPending = await prisma.message.findFirst({
            where: {
                senderId,
                itemId,
                type: "OFFER",
                offerStatus: "PENDING"
            }
        });
        if (existingPending) {
            throw new Error("Vous avez déjà une offre en attente pour cet objet.");
        }

        const content = `[OFFRE] Proposition d'achat à ${offerPrice.toFixed(2)} €`;

        const message = await prisma.message.create({
            data: {
                senderId,
                receiverId,
                content,
                itemId,
                type: "OFFER",
                offerPrice,
                offerStatus: "PENDING"
            },
            include: {
                sender: { select: { id: true, name: true, image: true } },
                item: { select: { id: true, title: true, sellerId: true, status: true } }
            }
        });

        // Socket emission
        const io = getIO();
        const receiverSockets = connectedUsers.get(receiverId);
        if (receiverSockets && receiverSockets.size > 0) {
            receiverSockets.forEach(socketId => io.to(socketId).emit("receive_message", message));
        } else {
            await prisma.notification.create({
                data: {
                    userId: receiverId,
                    type: "MESSAGE",
                    content: `${message.sender.name} vous a fait une offre de ${offerPrice}€ pour ${message.item!.title}.`
                }
            });
        }

        return message;
    }

    /**
     * Respond to an offer (Accept or Reject)
     */
    static async respondToOffer(userId: string, offerMessageId: string, action: "ACCEPTED" | "REJECTED") {
        const offer = await prisma.message.findUnique({
            where: { id: offerMessageId },
            include: { item: true, sender: true }
        });

        if (!offer || offer.type !== "OFFER" || offer.offerStatus !== "PENDING") {
            throw new Error("Invalid or already processed offer.");
        }

        if (offer.receiverId !== userId) {
            throw new Error("Not authorized to respond to this offer.");
        }

        // Update the offer message
        const updatedOffer = await prisma.message.update({
            where: { id: offerMessageId },
            data: { offerStatus: action },
            include: {
                sender: { select: { id: true, name: true, image: true } }
            }
        });

        // Send an automated system message notifying the original sender
        const notificationContent = action === "ACCEPTED"
            ? `🎉 Bonne nouvelle ! Votre offre de ${offer.offerPrice}€ pour ${offer.item?.title} a été acceptée.`
            : `❌ Votre offre de ${offer.offerPrice}€ a été déclinée.`;

        const systemMessage = await prisma.message.create({
            data: {
                content: notificationContent,
                senderId: userId,
                receiverId: offer.senderId,
                itemId: offer.itemId,
                type: "TEXT"
            },
            include: {
                sender: { select: { id: true, name: true, image: true } }
            }
        });

        // Websockets
        const io = getIO();

        // Push the updated offer bubble to the current user (if online on multiple tabs)
        const senderSockets = connectedUsers.get(userId);
        if (senderSockets) {
            senderSockets.forEach(s => io.to(s).emit("offer_updated", updatedOffer));
        }

        // Push the updated offer and the notification message to the other person
        const receiverSockets = connectedUsers.get(offer.senderId);
        if (receiverSockets && receiverSockets.size > 0) {
            receiverSockets.forEach(socketId => {
                io.to(socketId).emit("offer_updated", updatedOffer);
                io.to(socketId).emit("receive_message", systemMessage);
            });
        } else {
            await prisma.notification.create({
                data: {
                    userId: offer.senderId,
                    type: "SYSTEM",
                    content: notificationContent
                }
            });
        }

        return { updatedOffer, systemMessage };
    }
}
