import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export class UserController {
    /**
     * Get the authenticated user's profile including interests
     */
    static async getProfile(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: {
                    interests: true
                }
            });

            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }

            res.status(200).json({ data: user });
        } catch (error) {
            console.error("[UserController] GetProfile Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Get a user's public profile
     */
    static async getPublicProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id;
            if (!userId) {
                res.status(400).json({ error: "Missing user ID" });
                return;
            }

            const user = await prisma.user.findUnique({
                where: { id: userId as string },
                select: {
                    id: true,
                    name: true,
                    image: true,
                    createdAt: true
                }
            });

            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }

            const salesCount = await prisma.transaction.count({
                where: {
                    sellerId: userId as string,
                    status: "COMPLETED"
                }
            });

            res.status(200).json({
                id: user.id,
                name: user.name,
                image: user.image,
                createdAt: user.createdAt,
                salesCount: salesCount
            });
        } catch (error) {
            console.error("[UserController] GetPublicProfile Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Update the authenticated user's interests
     */
    static async updateInterests(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { categoryIds } = req.body;

            if (!Array.isArray(categoryIds)) {
                res.status(400).json({ error: "Invalid input. categoryIds must be an array of strings." });
                return;
            }

            // Sync the M2M relationship in Prisma
            const updatedUser = await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    interests: {
                        set: categoryIds.map((id: string) => ({ id }))
                    }
                },
                include: {
                    interests: true
                }
            });

            res.status(200).json({
                message: "Interests updated successfully",
                data: updatedUser.interests
            });
        } catch (error) {
            console.error("[UserController] UpdateInterests Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
