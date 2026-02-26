import { Router } from "express";
import { AdminController } from "../controllers/adminController.js";

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category retrieval
 */

const router = Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/", AdminController.getCategories);

export default router;
