import type { Request, Response } from "express";
import { RecommendationService } from "../services/recommendationService.js";
import { auth } from "../lib/auth.js";

export class RecommendationController {
    /**
     * Retrieves personalized recommendations for the logged-in user
     */
    static async getRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const session = await auth.api.getSession({
                headers: req.headers
            });

            if (!session || !session.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const items = await RecommendationService.getRecommendations(session.user.id);
            res.json({ data: items });
        } catch (error: any) {
            console.error("Recommendation Fetch Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Retrieves similar items for a specific item
     */
    static async getSimilarItems(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: "Item ID is required" });
                return;
            }
            const items = await RecommendationService.getSimilarItems(id as string);
            res.json({ data: items });
        } catch (error: any) {
            console.error("Similar Items Fetch Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
