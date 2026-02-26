import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { AdminController } from "../controllers/adminController.js";
import { auth } from "../lib/auth.js";

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations for users, items, and categories
 */

const router = Router();

// Admin Authorization Middleware
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session || !session.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        if (session.user.role !== "ADMIN") {
            res.status(403).json({ error: "Forbidden: Admins only" });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error during auth" });
    }
};

router.use(requireAdmin);

// Routes
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
router.get("/users", AdminController.getUsers);

/**
 * @swagger
 * /api/admin/users/{id}/ban:
 *   post:
 *     summary: Toggle user ban status
 *     tags: [Admin]
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
 *         description: User ban status toggled
 */
router.post("/users/:id/ban", AdminController.toggleUserBan);

/**
 * @swagger
 * /api/admin/items/pending:
 *   get:
 *     summary: List all pending items
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending items
 */
router.get("/items/pending", AdminController.getPendingItems);

/**
 * @swagger
 * /api/admin/items/{id}/status:
 *   post:
 *     summary: Update an item's status (APPROVE/REJECT)
 *     tags: [Admin]
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Item status updated
 */
router.post("/items/:id/status", AdminController.updateItemStatus);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: List all categories
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/categories", AdminController.getCategories);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
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
 *     responses:
 *       201:
 *         description: Category created
 */
router.post("/categories", AdminController.createCategory);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Admin]
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
 *         description: Category deleted
 */
router.delete("/categories/:id", AdminController.deleteCategory);

export default router;
