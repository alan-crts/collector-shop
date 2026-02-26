import type { Request, Response } from "express";
import { AdminService } from "../services/adminService.js";
import type { ItemStatus } from "@prisma/client";

export class AdminController {
    // ---- USERS ----
    static async getUsers(req: Request, res: Response): Promise<void> {
        try {
            const users = await AdminService.getUsers();
            res.json(users);
        } catch (error: any) {
            console.error("Admin getUsers Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    static async toggleUserBan(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { isBanned } = req.body;
            if (typeof isBanned !== "boolean") {
                res.status(400).json({ error: "Invalid payload: isBanned must be a boolean" });
                return;
            }
            const user = await AdminService.toggleUserBan(id as string, isBanned);
            res.json(user);
        } catch (error: any) {
            console.error("Admin toggleUserBan Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    // ---- ITEMS ----
    static async getPendingItems(req: Request, res: Response): Promise<void> {
        try {
            const items = await AdminService.getPendingItems();
            res.json(items);
        } catch (error: any) {
            console.error("Admin getPendingItems Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    static async updateItemStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!["APPROVED", "REJECTED"].includes(status)) {
                res.status(400).json({ error: "Invalid status" });
                return;
            }

            const item = await AdminService.updateItemStatus(id as string, status as ItemStatus);
            res.json(item);
        } catch (error: any) {
            console.error("Admin updateItemStatus Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    // ---- CATEGORIES ----
    static async getCategories(req: Request, res: Response): Promise<void> {
        try {
            const categories = await AdminService.getCategories();
            res.json(categories);
        } catch (error: any) {
            console.error("Admin getCategories Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    static async createCategory(req: Request, res: Response): Promise<void> {
        try {
            const { name, slug } = req.body;
            if (!name || !slug) {
                res.status(400).json({ error: "Missing name or slug" });
                return;
            }
            const category = await AdminService.createCategory(name, slug);
            res.status(201).json(category);
        } catch (error: any) {
            console.error("Admin createCategory Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    static async deleteCategory(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await AdminService.deleteCategory(id as string);
            res.status(204).send();
        } catch (error: any) {
            console.error("Admin deleteCategory Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
