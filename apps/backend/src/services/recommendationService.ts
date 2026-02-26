import prisma from "../lib/prisma.js";
import type { Item } from "@prisma/client";

export class RecommendationService {
    /**
     * Get recommended items for a user based on their interested categories
     */
    static async getRecommendations(userId: string): Promise<Item[]> {
        // Find the user and securely include their categorized interests
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { interests: true }
        });

        if (!user || user.interests.length === 0) {
            return [];
        }

        const categoryIds = user.interests.map(c => c.id);

        // Fetch recent APPROVED items within those categories, excluding user's own items
        const recommendations = await prisma.item.findMany({
            where: {
                status: "APPROVED",
                categoryId: { in: categoryIds },
                sellerId: { not: userId }
            },
            take: 20,
            orderBy: { createdAt: "desc" },
            include: {
                seller: { select: { name: true, image: true } },
                category: true
            }
        });

        return recommendations;
    }

    /**
     * Get similar items based on category
     */
    static async getSimilarItems(itemId: string): Promise<Item[]> {
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { categoryId: true, sellerId: true }
        });

        if (!item) return [];

        return prisma.item.findMany({
            where: {
                status: "APPROVED",
                categoryId: item.categoryId,
                id: { not: itemId },
                sellerId: { not: item.sellerId }
            },
            take: 10,
            include: {
                seller: { select: { name: true, image: true } },
                category: true
            }
        });
    }
}
