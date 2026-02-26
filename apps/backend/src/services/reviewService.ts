import prisma from "../lib/prisma.js";
import type { Review } from "@prisma/client";

export class ReviewService {
    /**
     * Get reviews received by a user (to calculate their score)
     */
    static async getReviewsByUserId(userId: string): Promise<Review[]> {
        return prisma.review.findMany({
            where: { revieweeId: userId },
            include: {
                reviewer: { select: { id: true, name: true, image: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Create a new review for a transaction
     */
    static async createReview(data: { reviewerId: string, revieweeId: string, rating: number, comment?: string, transactionId: string }): Promise<Review> {
        // Validation: Ensure the transaction exists, is COMPLETED, and involves both users
        const tx = await prisma.transaction.findFirst({
            where: {
                id: data.transactionId,
                status: "COMPLETED",
                OR: [
                    { buyerId: data.reviewerId, sellerId: data.revieweeId },
                    { buyerId: data.revieweeId, sellerId: data.reviewerId }
                ]
            }
        });

        if (!tx) {
            throw new Error("Invalid review: No matching COMPLETED transaction exists between these users.");
        }

        if (data.reviewerId === data.revieweeId) {
            throw new Error("You cannot review yourself.");
        }

        if (data.rating < 1 || data.rating > 5) {
            throw new Error("Rating must be between 1 and 5.");
        }

        // Check if review already exists for this transaction by this user
        const existing = await prisma.review.findUnique({
            where: {
                reviewerId_transactionId: {
                    reviewerId: data.reviewerId,
                    transactionId: data.transactionId
                }
            }
        });

        if (existing) {
            throw new Error("You have already reviewed this transaction.");
        }

        return prisma.review.create({
            data: {
                rating: data.rating,
                comment: data.comment || null,
                reviewerId: data.reviewerId,
                revieweeId: data.revieweeId,
                transactionId: data.transactionId,
            }
        });
    }

    /**
     * Get average rating for a user
     */
    static async getUserRatingSummary(userId: string): Promise<{ average: number, count: number }> {
        const aggr = await prisma.review.aggregate({
            where: { revieweeId: userId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        return {
            average: aggr._avg.rating || 0,
            count: aggr._count.rating,
        };
    }
}
