import { type Request, type Response } from "express";
import { PaymentService } from "../services/paymentService.js";

export class PaymentController {

    // POST /api/payment/create-session
    static async createSession(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { itemId, offerId } = req.body;
            if (!itemId) {
                res.status(400).json({ error: "itemId is required" });
                return;
            }

            const url = await PaymentService.createCheckoutSession(req.user.id, itemId, offerId);
            res.status(200).json({ url });

        } catch (error: any) {
            console.error("[PaymentController] createSession Error:", error);
            res.status(400).json({ error: error.message || "Failed to create checkout session" });
        }
    }

    // POST /api/payment/webhook
    static async webhook(req: Request, res: Response): Promise<void> {
        const sig = req.headers['stripe-signature'];
        if (!sig) {
            res.status(400).send("No signature provided");
            return;
        }

        try {
            // raw body is needed to verify webhook signature
            await PaymentService.handleWebhook(sig as string, req.body);
            res.status(200).json({ received: true });
        } catch (err: any) {
            console.error("[PaymentController] webhook Error:", err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }
}
