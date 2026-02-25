import { Router } from "express";
import { ItemController } from "../controllers/itemController.js";
import { requireSeller, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// Create an item (Authenticated, SELLER role required)
router.post("/", requireSeller, ItemController.create);

// Update an item (Authenticated, SELLER role required, verify ownership in service)
router.put("/:id", requireSeller, ItemController.update);

// Delete an item (Authenticated, SELLER role required, verify ownership in service)
router.delete("/:id", requireSeller, ItemController.delete);

// Get all items (Public or requiring auth for buyers? Usually public for viewing shop)
router.get("/", ItemController.getAll);

// Get specific item (Public)
router.get("/:id", ItemController.getById);

export default router;
