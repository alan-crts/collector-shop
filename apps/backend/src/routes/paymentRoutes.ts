import { Router } from "express";
import express from "express";
import { PaymentController } from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Stripe payment integration and webhooks
 */

const router = Router();

/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Payments]
 *     description: Receives events from Stripe (session.completed, etc.)
 *     responses:
 *       200:
 *         description: Webhook received
 */
// Endpoint for the webhook must be entirely raw for signature verification
router.post("/webhook", express.raw({ type: 'application/json' }), PaymentController.webhook);

// Other endpoints need json
router.use(express.json());

/**
 * @swagger
 * /api/payment/create-session:
 *   post:
 *     summary: Create a Stripe Checkout session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session created
 */
router.post("/create-session", requireAuth, PaymentController.createSession);

export default router;
