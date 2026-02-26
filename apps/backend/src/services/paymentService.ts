import Stripe from 'stripe';
import prisma from '../lib/prisma.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2024-12-18.acacia' as any,
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class PaymentService {
    static async createCheckoutSession(userId: string, itemId: string, offerId?: string) {
        // Fetch item
        const item = await prisma.item.findUnique({ where: { id: itemId } });
        if (!item) throw new Error("Item not found");
        if (item.status !== "APPROVED" && item.status !== "PENDING") {
            throw new Error("Cet objet n'est plus disponible.");
        }
        if (item.sellerId === userId) throw new Error("Vous ne pouvez pas acheter votre propre objet");

        let priceToPay = item.price;

        if (offerId) {
            const offer = await prisma.message.findUnique({ where: { id: offerId } });
            if (!offer || (offer.type as string) !== "OFFER" || (offer as any).offerStatus !== "ACCEPTED") {
                throw new Error("Offre invalide ou non acceptée");
            }
            if (offer.senderId !== userId && offer.receiverId !== userId) {
                throw new Error("Non autorisé");
            }
            priceToPay = (offer as any).offerPrice || item.price;
        }

        // Calculate checkout total (in cents)
        const platformFee = Math.round(priceToPay * 0.05 * 100); // 5% fee in cents
        const itemTotalInCents = Math.round(priceToPay * 100);
        const shippingInCents = Math.round((item.shippingCost || 0) * 100);

        // Create a Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: item.title,
                            description: `Frais de port inclus: ${item.shippingCost}€, Commission (5%): ${(platformFee / 100).toFixed(2)}€`,
                        },
                        unit_amount: itemTotalInCents + platformFee + shippingInCents,
                    },
                    quantity: 1,
                }
            ],
            success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/catalog/${item.id}`,
            metadata: {
                userId,
                itemId,
                offerId: offerId || null,
            }
        });

        return session.url;
    }

    static async handleWebhook(signature: string, rawBody: string | Buffer) {
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
            );
        } catch (err: any) {
            console.error("Stripe signature error:", err.message);
            throw new Error(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const metadata = session.metadata;
            if (metadata && metadata.itemId && metadata.userId) {
                const amount = session.amount_total ? session.amount_total / 100 : 0;

                const item = await prisma.item.findUnique({ where: { id: metadata.itemId } });
                if (!item) {
                    console.error("Webhook processing failed: Item not found.");
                    return;
                }

                // Process the purchase transaction inside a prisma transaction
                await prisma.$transaction([
                    prisma.transaction.create({
                        data: {
                            buyerId: metadata.userId,
                            itemId: metadata.itemId,
                            amount: amount,
                            commission: Math.round(amount * 0.05 * 100) / 100, // Roughly standardizing commission tracking
                            sellerId: item.sellerId,
                            status: "COMPLETED",
                            stripeSessionId: session.id,
                        }
                    }),
                    prisma.item.update({
                        where: { id: metadata.itemId },
                        data: { status: "SOLD" }
                    })
                ]);
            }
        }
    }
}
