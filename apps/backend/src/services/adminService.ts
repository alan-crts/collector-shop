import prisma from "../lib/prisma.js";
import type { User, Item, Category, ItemStatus } from "@prisma/client";

export class AdminService {
    /**
     * Get all users with their roles and ban status
     */
    static async getUsers(): Promise<User[]> {
        return prisma.user.findMany({
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Toggle a user's ban status
     */
    static async toggleUserBan(userId: string, isBanned: boolean): Promise<User> {
        return prisma.user.update({
            where: { id: userId },
            data: { isBanned },
        });
    }

    /**
     * Get all items currently pending review
     */
    static async getPendingItems(): Promise<Item[]> {
        return prisma.item.findMany({
            where: { status: "PENDING" },
            include: { seller: true },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Change an item's status
     */
    static async updateItemStatus(itemId: string, status: ItemStatus): Promise<Item> {
        return prisma.item.update({
            where: { id: itemId },
            data: { status },
        });
    }

    /**
     * Get all categories
     */
    static async getCategories(): Promise<Category[]> {
        return prisma.category.findMany({
            orderBy: { name: "asc" },
        });
    }

    /**
     * Create a new category
     */
    static async createCategory(name: string, slug: string): Promise<Category> {
        return prisma.category.create({
            data: {
                name,
                slug,
            },
        });
    }

    /**
     * Delete a category
     */
    static async deleteCategory(categoryId: string): Promise<void> {
        await prisma.category.delete({
            where: { id: categoryId },
        });
    }
}
