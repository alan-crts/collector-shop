import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { ItemService, type ItemStatusType } from "../services/itemService.js";
import { auth } from "../lib/auth.js";

/**
 * Controller for managing items via HTTP
 */
export class ItemController {

    /**
     * Create a new item (POST /items)
     */
    static async create(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { title, description, price, images } = req.body;

            // Validate input
            if (!title || !description || typeof price !== "number") {
                res.status(400).json({ error: "Invalid input. Title, description and numeric price are required." });
                return;
            }

            const sellerId = req.user.id;
            const newItem = await ItemService.createItem(title, description, price, sellerId, images || []);

            console.log(`[ItemController] Created Item: ${newItem.id} with status ${newItem.status}`);

            res.status(201).json({
                message: "Item created successfully",
                data: newItem,
            });

        } catch (error) {
            console.error("[ItemController] Create Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Get all items (GET /items)
     */
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            let statusQuery = req.query.status as ItemStatusType | undefined;

            // Check session to see if Admin
            let isAdmin = false;
            try {
                const session = await auth.api.getSession({ headers: req.headers });
                console.log("[ItemController] Session:", session);
                if (session && session.user) {
                    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
                    if (dbUser?.role === "ADMIN") {
                        isAdmin = true;
                    }
                }
            } catch (e) {
                // Ignore session fetch errors
            }

            // Public users only see APPROVED items. If no status is specified, default to APPROVED for public users.
            if (!isAdmin) {
                statusQuery = "APPROVED"; // Force APPROVED if not admin
            }

            console.log("[ItemController] Status Query:", statusQuery);

            const items = await ItemService.getItems(statusQuery);
            res.status(200).json({ data: items });
        } catch (error) {
            console.error("[ItemController] GetAll Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Get a single item (GET /items/:id)
     */
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const item = await ItemService.getItemById(id);

            if (!item) {
                res.status(404).json({ error: "Item not found" });
                return;
            }

            res.status(200).json({ data: item });
        } catch (error) {
            console.error("[ItemController] GetById Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Update an item (PUT /items/:id)
     */
    static async update(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const id = req.params.id as string;
            const { title, description, price, images, status } = req.body;
            const sellerId = req.user.id;

            let isAdmin = false;
            if (req.user.role === "ADMIN") {
                isAdmin = true;
            } else {
                const dbUser = await prisma.user.findUnique({ where: { id: sellerId }, select: { role: true } });
                isAdmin = dbUser?.role === "ADMIN";
            }

            try {
                const updatedItem = await ItemService.updateItem(id, sellerId, { title, description, price, images, status }, isAdmin);

                if (!updatedItem) {
                    res.status(404).json({ error: "Item not found" });
                    return;
                }

                console.log(`[ItemController] Updated Item: ${id}`);
                res.status(200).json({
                    message: "Item updated successfully",
                    data: updatedItem,
                });
            } catch (serviceError: any) {
                if (serviceError.message && serviceError.message.includes("Forbidden")) {
                    res.status(403).json({ error: serviceError.message });
                    return;
                }
                throw serviceError;
            }
        } catch (error) {
            console.error("[ItemController] Update Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Delete an item (DELETE /items/:id)
     */
    static async delete(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const id = req.params.id as string;
            const sellerId = req.user.id;

            let isAdmin = false;
            if (req.user.role === "ADMIN") {
                isAdmin = true;
            } else {
                const dbUser = await prisma.user.findUnique({ where: { id: sellerId }, select: { role: true } });
                isAdmin = dbUser?.role === "ADMIN";
            }

            try {
                const success = await ItemService.deleteItem(id, sellerId, isAdmin);

                if (!success) {
                    res.status(404).json({ error: "Item not found" });
                    return;
                }

                console.log(`[ItemController] Deleted Item: ${id}`);
                res.status(204).send(); // No content
            } catch (serviceError: any) {
                if (serviceError.message && serviceError.message.includes("Forbidden")) {
                    res.status(403).json({ error: serviceError.message });
                    return;
                }
                throw serviceError;
            }
        } catch (error) {
            console.error("[ItemController] Delete Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
