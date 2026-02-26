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

export default router;
