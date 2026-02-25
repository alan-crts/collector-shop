import { Router } from "express";
import { UploadController } from "../controllers/uploadController.js";
import { requireSeller, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// Endpoint for generating an S3 presigned URL for direct upload
// All authenticated users can upload (for profile pics, etc.)
router.post("/presigned-url", requireAuth, UploadController.getPresignedUrl);

export default router;
