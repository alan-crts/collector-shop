import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export class NotificationController {

    /**
     * Gets all notifications for the logged-in user
     */
    static async getNotifications(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const unreadOnly = req.query.unread === 'true';

            const notifications = await prisma.notification.findMany({
                where: {
                    userId: req.user.id,
                    ...(unreadOnly ? { isRead: false } : {})
                },
                orderBy: { createdAt: 'desc' }
            });

            res.status(200).json({ data: notifications });

        } catch (error) {
            console.error("[NotificationController] getNotifications:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Get unread counts for both notifications and messages
     */
    static async getUnreadCounts(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const [unreadNotifications, unreadMessages] = await Promise.all([
                prisma.notification.count({
                    where: { userId: req.user.id, isRead: false }
                }),
                prisma.message.count({
                    where: { receiverId: req.user.id, isRead: false }
                })
            ]);

            res.status(200).json({
                data: {
                    notifications: unreadNotifications,
                    messages: unreadMessages,
                    total: unreadNotifications + unreadMessages
                }
            });

        } catch (error) {
            console.error("[NotificationController] getUnreadCounts:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Mark specific or all notifications as read
     */
    static async markRead(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { notificationIds } = req.body;

            let count = 0;
            if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
                const result = await prisma.notification.updateMany({
                    where: { id: { in: notificationIds }, userId: req.user.id },
                    data: { isRead: true }
                });
                count = result.count;
            } else {
                // Mark all as read
                const result = await prisma.notification.updateMany({
                    where: { userId: req.user.id, isRead: false },
                    data: { isRead: true }
                });
                count = result.count;
            }

            res.status(200).json({ message: "Notifications marked as read", count });

        } catch (error) {
            console.error("[NotificationController] markRead:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
