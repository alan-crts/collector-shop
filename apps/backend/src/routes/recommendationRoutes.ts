import { Router } from "express";
import { RecommendationController } from "../controllers/recommendationController.js";

/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: Personalized item recommendations
 */

const router = Router();

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get recommended items for the current user
 *     tags: [Recommendations]
 *     responses:
 *       200:
 *         description: List of recommended items
 */
router.get("/", RecommendationController.getRecommendations);

/**
 * @swagger
 * /api/recommendations/similar/{id}:
 *   get:
 *     summary: Get similar items for a specific item
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of similar items
 */
router.get("/similar/:id", RecommendationController.getSimilarItems);

export default router;
