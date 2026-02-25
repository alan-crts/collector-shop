import prisma from "../lib/prisma.js";
import type { Item } from "@prisma/client";

export type ItemStatusType = "PENDING" | "APPROVED" | "REJECTED";

export class ItemService {
    /**
     * Calculates the commission fee (5%)
     */
    static calculateCommission(price: number): number {
        return price * 0.05;
    }

    /**
     * Determines the initial status based on price
     */
    static determineInitialStatus(price: number): ItemStatusType {
        return price > 1000 ? "PENDING" : "APPROVED";
    }

    /**
     * Create a new item
     */
    static async createItem(
        title: string,
        description: string,
        price: number,
        sellerId: string,
        images: string[] = []
    ): Promise<Item & { commissionFee: number }> {
        const status = this.determineInitialStatus(price);
        const commissionFee = this.calculateCommission(price);

        const item = await prisma.item.create({
            data: {
                title,
                description,
                price,
                status,
                sellerId,
                images,
            },
        });

        return { ...item, commissionFee };
    }

    /**
     * Get all items (can be extended with pagination/filtering)
     */
    static async getItems(status?: ItemStatusType): Promise<Item[]> {
        const whereClause = status ? { status } : {};
        return prisma.item.findMany({
            where: whereClause,
            include: {
                seller: true,
            },
            orderBy: { id: 'desc' }
        });
    }

    /**
     * Get a single item by ID
     */
    static async getItemById(id: string): Promise<Item | null> {
        return prisma.item.findUnique({
            where: { id },
            include: {
                seller: true,
            },
        });
    }

    /**
     * Update an item
     */
    static async updateItem(
        id: string,
        sellerId: string,
        data: { title?: string; description?: string; price?: number; images?: string[]; status?: ItemStatusType },
        isAdmin: boolean = false
    ): Promise<(Item & { commissionFee?: number }) | null> {
        // Verify ownership
        const existingItem = await prisma.item.findUnique({ where: { id } });
        if (!existingItem) {
            return null;
        }
        if (!isAdmin && existingItem.sellerId !== sellerId) {
            throw new Error("Forbidden: You are not the owner of this item.");
        }

        let status = data.status || existingItem.status;
        let commissionFee: number | undefined;

        // Recalculate status and commission if price changes
        if (data.price !== undefined && data.price !== existingItem.price) {
            if (!data.status) {
                status = this.determineInitialStatus(data.price);
            }
            commissionFee = this.calculateCommission(data.price);
        }

        const updatedItem = await prisma.item.update({
            where: { id },
            data: {
                ...data,
                status, // Update status if price changed, else keep old
            },
        });

        return commissionFee !== undefined
            ? { ...updatedItem, commissionFee }
            : updatedItem;
    }

    /**
     * Delete an item
     */
    static async deleteItem(id: string, sellerId: string, isAdmin: boolean = false): Promise<boolean> {
        // Verify ownership
        const existingItem = await prisma.item.findUnique({ where: { id } });
        if (!existingItem) {
            return false; // Not found
        }
        if (!isAdmin && existingItem.sellerId !== sellerId) {
            throw new Error("Forbidden: You are not the owner of this item.");
        }

        await prisma.item.delete({
            where: { id },
        });
        return true;
    }
}
