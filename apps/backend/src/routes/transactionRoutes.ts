import { Router } from "express";
import { TransactionController } from "../controllers/transactionController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: User purchase and sale history
 */

const router = Router();

/**
 * @swagger
 * /api/transactions/purchases:
 *   get:
 *     summary: Get current user's purchase history
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchases
 */
// Routes for purchases and sales history
router.get("/purchases", requireAuth, TransactionController.getMyPurchases);

/**
 * @swagger
 * /api/transactions/sales:
 *   get:
 *     summary: Get current user's sales history
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sales
 */
router.get("/sales", requireAuth, TransactionController.getMySales);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get details of a specific transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
// Route for specific transaction details
router.get("/:id", requireAuth, TransactionController.getById);

export default router;
