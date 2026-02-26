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
     * Identifies emails or phone numbers inside descriptions/titles
     */
    static hasRestrictedContent(text: string): boolean {
        if (!text) return false;
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i;
        const phoneRegex = /(\+33|0)[1-9](\s?\d{2}){4}/;
        return emailRegex.test(text) || phoneRegex.test(text);
    }

    /**
     * Create a new item
     */
    static async createItem(
        title: string,
        description: string,
        price: number,
        sellerId: string,
        images: string[] = [],
        categoryId?: string
    ): Promise<Item & { commissionFee: number }> {
        if (this.hasRestrictedContent(title) || this.hasRestrictedContent(description)) {
            throw new Error("Validation Error: Emails and phone numbers are not allowed in item listings.");
        }

        const status = this.determineInitialStatus(price);
        const commissionFee = this.calculateCommission(price);

        const item = await prisma.item.create({
            data: {
                title,
                description,
                price,
                status,
                sellerId,
                categoryId: categoryId || null,
                images,
            },
        });

        return { ...item, commissionFee };
    }

    /**
     * Get all items (can be extended with pagination/filtering) allow multiple status
     */
    static async getItems(status?: ItemStatusType[], sellerId?: string, categoryId?: string): Promise<Item[]> {
        const whereClause: any = {};
        if (status) whereClause.status = { in: status };
        if (sellerId) whereClause.sellerId = sellerId;
        if (categoryId) whereClause.categoryId = categoryId;

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
        if (data.title && this.hasRestrictedContent(data.title)) {
            throw new Error("Validation Error: Emails and phone numbers are not allowed in item listings.");
        }
        if (data.description && this.hasRestrictedContent(data.description)) {
            throw new Error("Validation Error: Emails and phone numbers are not allowed in item listings.");
        }

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
