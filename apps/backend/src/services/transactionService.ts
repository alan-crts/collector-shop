import prisma from "../lib/prisma.js";
import type { Transaction, TransactionStatus } from "@prisma/client";

export class TransactionService {

    /**
     * Get transactions where the user is the buyer
     */
    static async getPurchasesByBuyerId(buyerId: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { buyerId },
            include: {
                item: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: true,
                    }
                },
                seller: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    /**
     * Get transactions where the user is the seller
     */
    static async getSalesBySellerId(sellerId: string): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: { sellerId },
            include: {
                item: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: true,
                    }
                },
                buyer: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    /**
     * Get a specific transaction, checking that the user is either the buyer or seller
     */
    static async getTransactionByIdAndParticipant(transactionId: string, userId: string): Promise<Transaction | null> {
        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                item: true,
                buyer: { select: { id: true, name: true } },
                seller: { select: { id: true, name: true } },
            }
        });

        if (!tx) return null;

        if (tx.buyerId !== userId && tx.sellerId !== userId) {
            throw new Error("Forbidden: You are not a participant in this transaction.");
        }

        return tx;
    }
}
