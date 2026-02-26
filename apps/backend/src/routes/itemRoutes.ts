import { Router } from "express";
import { ItemController } from "../controllers/itemController.js";
import { requireSeller, requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Item management and retrieval
 */

const router = Router();

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item created successfully
 *       403:
 *         description: Forbidden (requires SELLER role)
 */
// Create an item (Authenticated, SELLER role required)
router.post("/", requireSeller, ItemController.create);

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items
 *     tags: [Items]
 *     responses:
 *       200:
 *         description: List of items
 */
// Get all items (Public or requiring auth for buyers? Usually public for viewing shop)
router.get("/", ItemController.getAll);

/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get a specific item by ID
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item found
 *       404:
 *         description: Item not found
 */
// Get specific item (Public)
router.get("/:id", ItemController.getById);

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Update an item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Item updated successfully
 */
// Update an item (Authenticated, SELLER role required, verify ownership in service)
router.put("/:id", requireSeller, ItemController.update);

/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Delete an item
 *     tags: [Items]
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
 *         description: Item deleted successfully
 */
// Delete an item (Authenticated, SELLER role required, verify ownership in service)
router.delete("/:id", requireSeller, ItemController.delete);

export default router;
