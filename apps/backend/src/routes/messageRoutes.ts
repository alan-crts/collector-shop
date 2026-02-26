import { Router } from "express";
import { MessageController } from "../controllers/messageController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Chat and offer management
 */

const router = Router();

// All message routes strictly require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for the current user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get("/conversations", MessageController.getConversations);

/**
 * @swagger
 * /api/messages/history:
 *   get:
 *     summary: Get message history with a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get("/history", MessageController.getHistory);

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a text message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post("/", MessageController.sendMessage);

/**
 * @swagger
 * /api/messages/read:
 *   post:
 *     summary: Mark messages from a user as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               senderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 */
router.post("/read", MessageController.markRead);

/**
 * @swagger
 * /api/messages/offer:
 *   post:
 *     summary: Send a price offer for an item
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *               itemId:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Offer sent
 */
router.post("/offer", MessageController.sendOffer);

/**
 * @swagger
 * /api/messages/offer/{messageId}/respond:
 *   post:
 *     summary: Respond to a price offer (ACCEPT/REJECT)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [ACCEPT, REJECT]
 *     responses:
 *       200:
 *         description: Offer response processed
 */
router.post("/offer/:messageId/respond", MessageController.respondToOffer);

export default router;
