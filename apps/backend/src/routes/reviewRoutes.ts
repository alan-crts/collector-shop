import { Router } from "express";
import { ReviewController } from "../controllers/reviewController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: User reviews and ratings
 */

const router = Router();

/**
 * @swagger
 * /api/reviews/user/{id}:
 *   get:
 *     summary: Get reviews for a specific user
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews
 */
// Get reviews for a specific user
router.get("/user/:id", ReviewController.getUserReviews);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUserId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               transactionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created
 */
// Create a review
router.post("/", requireAuth, ReviewController.createReview);

export default router;
