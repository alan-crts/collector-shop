import type { Request, Response } from "express";
import { TransactionService } from "../services/transactionService.js";
import { auth } from "../lib/auth.js";

export class TransactionController {

    /**
     * Get the logged-in user's purchases
     * (GET /transactions/purchases)
     */
    static async getMyPurchases(req: Request, res: Response): Promise<void> {
        try {
            const session = await auth.api.getSession({ headers: req.headers });
            if (!session?.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const purchases = await TransactionService.getPurchasesByBuyerId(session.user.id);
            res.status(200).json({ data: purchases });
        } catch (error) {
            console.error("[TransactionController] getMyPurchases Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Get the logged-in user's sales history
     * (GET /transactions/sales)
     */
    static async getMySales(req: Request, res: Response): Promise<void> {
        try {
            const session = await auth.api.getSession({ headers: req.headers });
            if (!session?.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const sales = await TransactionService.getSalesBySellerId(session.user.id);
            res.status(200).json({ data: sales });
        } catch (error) {
            console.error("[TransactionController] getMySales Error:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Get a specific transaction details
     * (GET /transactions/:id)
     */
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const session = await auth.api.getSession({ headers: req.headers });
            if (!session?.user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const txId = req.params.id as string;
            const transaction = await TransactionService.getTransactionByIdAndParticipant(txId, session.user.id);

            if (!transaction) {
                res.status(404).json({ error: "Transaction not found" });
                return;
            }

            res.status(200).json({ data: transaction });
        } catch (error: any) {
            console.error("[TransactionController] getById Error:", error);
            if (error.message.includes("Forbidden")) {
                res.status(403).json({ error: error.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}
