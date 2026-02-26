import type { Request, Response } from "express";
import { MessageService } from "../services/messageService.js";

export class MessageController {

    /**
     * Gets all conversation threads for the logged-in user
     */
    static async getConversations(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const threads = await MessageService.getConversations(req.user.id);
            res.status(200).json({ data: threads });

        } catch (error) {
            console.error("[MessageController] getConversations Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Gets full message history with a specific partner and optionally tied to an item
     */
    static async getHistory(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const partnerId = req.query.partnerId as string;
            const itemId = req.query.itemId as string | undefined;

            if (!partnerId) {
                res.status(400).json({ error: "partnerId is required" });
                return;
            }

            const messages = await MessageService.getMessages(req.user.id, partnerId, itemId);
            res.status(200).json({ data: messages });

        } catch (error) {
            console.error("[MessageController] getHistory Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Send a new message
     */
    static async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { receiverId, content, itemId } = req.body;

            if (!receiverId || !content) {
                res.status(400).json({ error: "receiverId and content are required" });
                return;
            }

            try {
                const message = await MessageService.sendMessage(req.user.id, receiverId, content, itemId);
                res.status(201).json({ data: message });
            } catch (serviceError: any) {
                if (serviceError.message && serviceError.message.includes("Validation Error")) {
                    res.status(400).json({ error: serviceError.message });
                    return;
                }
                throw serviceError;
            }

        } catch (error) {
            console.error("[MessageController] sendMessage Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Marks messages as read
     */
    static async markRead(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { messageIds } = req.body;

            if (!messageIds || !Array.isArray(messageIds)) {
                res.status(400).json({ error: "messageIds array is required" });
                return;
            }

            const count = await MessageService.markAsRead(req.user.id, messageIds);
            res.status(200).json({ message: "Messages marked as read", count });

        } catch (error) {
            console.error("[MessageController] markRead Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Send a new price offer
     */
    static async sendOffer(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { receiverId, itemId, offerPrice } = req.body;

            if (!receiverId || !itemId || offerPrice === undefined) {
                res.status(400).json({ error: "receiverId, itemId, and offerPrice are required" });
                return;
            }

            const message = await MessageService.sendOffer(req.user.id, receiverId, itemId, parseFloat(offerPrice));
            res.status(201).json({ data: message });

        } catch (error: any) {
            console.error("[MessageController] sendOffer Error:", error);
            res.status(error.message.includes("Item not found") || error.message.includes("Invalid") || error.message.includes("offre") ? 400 : 500).json({ error: error.message || "Internal Server Error" });
        }
    }

    /**
     * Respond to an active offer (Accept/Reject)
     */
    static async respondToOffer(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const messageId = req.params.messageId as string;
            const { action } = req.body; // 'ACCEPTED' | 'REJECTED'

            if (!messageId || !["ACCEPTED", "REJECTED"].includes(action)) {
                res.status(400).json({ error: "Valid messageId in path and action (ACCEPTED/REJECTED) in body are required" });
                return;
            }

            const result = await MessageService.respondToOffer(req.user.id, messageId, action as "ACCEPTED" | "REJECTED");
            res.status(200).json({ data: result });

        } catch (error: any) {
            console.error("[MessageController] respondToOffer Error:", error);
            res.status(error.message.includes("Not authorized") || error.message.includes("Invalid") ? 400 : 500).json({ error: error.message || "Internal Server Error" });
        }
    }
}
