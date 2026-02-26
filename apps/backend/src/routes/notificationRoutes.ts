import { Router } from "express";
import { NotificationController } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification management
 */

const router = Router();

router.use(requireAuth);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get("/", NotificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread-counts:
 *   get:
 *     summary: Get unread notification counts
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread counts retrieved
 */
router.get("/unread-counts", NotificationController.getUnreadCounts);

/**
 * @swagger
 * /api/notifications/read:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.post("/read", NotificationController.markRead);

export default router;
