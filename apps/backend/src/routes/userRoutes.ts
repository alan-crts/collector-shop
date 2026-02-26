import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and preference management
 */

const router = Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", requireAuth, UserController.getProfile);

/**
 * @swagger
 * /api/users/interests:
 *   put:
 *     summary: Update user interests
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Interests updated successfully
 */
router.put("/interests", requireAuth, UserController.updateInterests);

/**
 * @swagger
 * /api/users/{id}/public:
 *   get:
 *     summary: Get a public profile by user ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public profile retrieved successfully
 *       404:
 *         description: User not found
 */
// Public profile
router.get("/:id/public", UserController.getPublicProfile);

export default router;
