import { Router } from "express";
import { UploadController } from "../controllers/uploadController.js";
import { requireSeller, requireAuth } from "../middleware/authMiddleware.js";

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: File upload operations (S3 presigned URLs)
 */

const router = Router();

/**
 * @swagger
 * /api/upload/presigned-url:
 *   post:
 *     summary: Generate an S3 presigned URL for direct upload
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *               fileType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presigned URL generated
 */
// Endpoint for generating an S3 presigned URL for direct upload
// All authenticated users can upload (for profile pics, etc.)
router.post("/presigned-url", requireAuth, UploadController.getPresignedUrl);

export default router;
