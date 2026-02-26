import type { Request, Response } from "express";
import { ReviewService } from "../services/reviewService.js";
import { auth } from "../lib/auth.js";

export class ReviewController {

    /**
     * Get a user's reviews (GET /reviews/user/:id)
     */
    static async getUserReviews(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id as string;
            const reviews = await ReviewService.getReviewsByUserId(userId);
            const summary = await ReviewService.getUserRatingSummary(userId);

            res.status(200).json({ data: { reviews, summary } });
        } catch (error) {
            console.error("[ReviewController] getUserReviews Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Leave a review (POST /reviews)
     * Requires auth
     */
    static async createReview(req: Request, res: Response): Promise<void> {
        try {
            const session = await auth.api.getSession({ headers: req.headers });
            if (!session?.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { revieweeId, rating, comment, transactionId } = req.body;

            if (!revieweeId || rating === undefined || !transactionId) {
                res.status(400).json({ error: "Missing required fields" });
                return;
            }

            const review = await ReviewService.createReview({
                reviewerId: session.user.id,
                revieweeId,
                rating: Number(rating),
                comment,
                transactionId
            });

            res.status(201).json({ data: review });
        } catch (error: any) {
            console.error("[ReviewController] createReview Error:", error);
            if (error.message.includes("already reviewed") || error.message.includes("Invalid review") || error.message.includes("cannot review yourself")) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}
