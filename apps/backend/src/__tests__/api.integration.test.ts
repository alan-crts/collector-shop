import request from "supertest";
import { app } from "../app.js";
import { jest, describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import prisma from "../lib/prisma.js";
import { auth } from "../lib/auth.js";
import * as socketUtils from "../lib/socket.js";
import { PaymentService } from "../services/paymentService.js";

describe("API Integration Tests", () => {
    let sellerId: string;

    beforeAll(async () => {
        await prisma.$connect();
        // Initialize Socket.io with a dummy server to avoid "not initialized" errors
        const { createServer } = await import("http");
        const dummyServer = createServer();
        socketUtils.initSocket(dummyServer);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe("GET /api/categories", () => {
        it("should return a list of categories", async () => {
            const res = await request(app).get("/api/categories");

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty("name");
                expect(res.body[0]).toHaveProperty("slug");
            }
        });
    });

    describe("Items API", () => {
        let itemId: string;

        beforeAll(async () => {
            const user = await prisma.user.findFirst({ where: { role: "SELLER" } });
            sellerId = user?.id || "";

            // Ensure the user actually has the SELLER role in the database for the middleware check
            if (user && user.role !== "SELLER") {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { role: "SELLER" }
                });
            }

            const category = await prisma.category.findFirst();
            const item = await prisma.item.create({
                data: {
                    title: "CRUD Test Item",
                    description: "Original description",
                    price: 100,
                    sellerId: sellerId,
                    categoryId: category?.id || ""
                }
            });
            itemId = item.id;
        });

        it("should return a list of items", async () => {
            const res = await request(app).get("/api/items");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it("should return a single item", async () => {
            const res = await request(app).get(`/api/items/${itemId}`);
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(itemId);
        });

        it("should return 404 for non-existent item", async () => {
            const res = await request(app).get("/api/items/non-existent-id");
            expect(res.status).toBe(404);
        });

        it("should allow a seller to update their item", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: sellerId, role: "SELLER" },
                session: {}
            } as any);

            const res = await request(app)
                .put(`/api/items/${itemId}`)
                .send({
                    title: "Updated Item Name",
                    price: 150,
                    description: "Updated description"
                });

            if (res.status !== 200) {
                console.log("Update Item Failed Body:", res.body);
            }
            expect(res.status).toBe(200);
            expect(res.body.data.title).toBe("Updated Item Name");
            jest.restoreAllMocks();
        });

        it("should return 400 for invalid update data", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: sellerId, role: "SELLER" },
                session: {}
            } as any);

            const res = await request(app)
                .put(`/api/items/${itemId}`)
                .send({ price: "invalid" });
            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });

        it("should allow a seller to delete their item", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: sellerId, role: "SELLER" },
                session: {}
            } as any);

            const res = await request(app).delete(`/api/items/${itemId}`);
            if (res.status !== 204) {
                console.log("Delete Item Failed Body:", res.body);
            }
            expect(res.status).toBe(204);

            const check = await prisma.item.findUnique({ where: { id: itemId } });
            expect(check).toBeNull();
            jest.restoreAllMocks();
        });
    });

    describe("Authentication Middleware & Errors", () => {
        it("should return 401 when trying to create an item without token", async () => {
            const res = await request(app)
                .post("/api/items")
                .send({
                    title: "Intégration Test Item",
                    description: "Test description",
                    price: 100,
                    images: []
                });

            expect(res.status).toBe(401);
        });

        it("should return 400 if title or description is missing in create", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: sellerId, role: "SELLER" },
                session: {}
            } as any);

            const res = await request(app)
                .post("/api/items")
                .send({ title: "No description", price: 10 });

            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });
    });

    describe("Messaging API (US-002)", () => {
        let senderId: string;
        let receiverId: string;

        beforeAll(async () => {
            const users = await prisma.user.findMany({ take: 2, select: { id: true } });
            if (users.length < 2) {
                // Create dummy users if not enough
                const u1 = await prisma.user.create({ data: { email: "test_sender@example.com", name: "Sender" } });
                const u2 = await prisma.user.create({ data: { email: "test_receiver@example.com", name: "Receiver" } });
                senderId = u1.id;
                receiverId = u2.id;
            } else {
                senderId = users[0]!.id;
                receiverId = users[1]!.id;
            }
        });

        it("should allow an authenticated user to send a message", async () => {
            const spy = jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: senderId, email: "test_sender@example.com", role: "BUYER" },
                session: { id: "test-session", expiresAt: new Date(Date.now() + 1000 * 60) }
            } as any);

            const res = await request(app)
                .post("/api/messages")
                .send({
                    receiverId: receiverId,
                    content: "Hello, is this item still available?"
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty("content", "Hello, is this item still available?");
            expect(res.body.data).toHaveProperty("receiverId", receiverId);
            expect(res.body.data).toHaveProperty("senderId", senderId);

            spy.mockRestore();
        });

        it("should return 400 if content is empty", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: senderId },
                session: {}
            } as any);

            const res = await request(app)
                .post("/api/messages")
                .send({
                    receiverId: receiverId,
                    content: ""
                });

            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });
    });
    describe("Admin API", () => {
        let adminId: string;
        let userId: string;

        beforeAll(async () => {
            const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
            const user = await prisma.user.findFirst({ where: { role: "BUYER" } });
            adminId = admin?.id || "";
            userId = user?.id || "";
        });

        it("should allow an admin to list users", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: adminId, role: "ADMIN" },
                session: {}
            } as any);

            const res = await request(app).get("/api/admin/users");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should forbid non-admins from accessing admin routes", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: userId, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app).get("/api/admin/users");
            expect(res.status).toBe(403);
            jest.restoreAllMocks();
        });
    });

    describe("Reviews API", () => {
        let buyerId: string;
        let sellerId: string;
        let transactionId: string;

        beforeAll(async () => {
            const buyer = await prisma.user.findFirst({ where: { role: "BUYER" } });
            const seller = await prisma.user.findFirst({ where: { role: "SELLER" } });
            buyerId = buyer?.id || "";
            sellerId = seller?.id || "";

            // Find or create a COMPLETED transaction for testing
            let transaction = await prisma.transaction.findFirst({
                where: { status: "COMPLETED" }
            });

            if (!transaction && buyerId && sellerId) {
                // Create a dummy item if needed
                const item = await prisma.item.create({
                    data: {
                        title: "Review Test Item",
                        description: "Test description for review",
                        price: 50,
                        sellerId: sellerId,
                        categoryId: (await prisma.category.findFirst())?.id || ""
                    }
                });

                transaction = await prisma.transaction.create({
                    data: {
                        buyerId: buyerId,
                        sellerId: sellerId,
                        itemId: item.id,
                        amount: 50,
                        commission: 5,
                        status: "COMPLETED"
                    }
                });
            }

            // Cleanup any existing reviews for this transaction to avoid "already reviewed" error
            if (transaction) {
                await prisma.review.deleteMany({
                    where: { transactionId: transaction.id }
                });
            }

            transactionId = transaction?.id || "";
        });

        it("should return reviews for a specific user", async () => {
            const res = await request(app).get(`/api/reviews/user/${sellerId}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("reviews");
            expect(Array.isArray(res.body.data.reviews)).toBe(true);
        });

        it("should allow creating a review if authenticated", async () => {
            if (!transactionId) return;

            // Fetch the transaction to get the real participants
            const tx = await prisma.transaction.findUnique({
                where: { id: transactionId }
            });

            if (!tx) return;

            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: tx.buyerId },
                session: {}
            } as any);

            const res = await request(app)
                .post("/api/reviews")
                .send({
                    revieweeId: tx.sellerId,
                    rating: 5,
                    comment: "Excellent service!",
                    transactionId: tx.id
                });

            if (res.status !== 201) {
                console.log("Review Creation Failed Body:", res.body);
            }
            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty("rating", 5);
            jest.restoreAllMocks();
        });
    });

    describe("Payment API", () => {
        let buyerId: string;
        let itemId: string;

        beforeAll(async () => {
            const buyer = await prisma.user.findFirst({ where: { role: "BUYER" } });
            buyerId = buyer?.id || "";
            const item = await prisma.item.findFirst();
            itemId = item?.id || "";
        });

        it("should return a Stripe session for checkout", async () => {
            if (!itemId) return;

            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            // Mock PaymentService to avoid Stripe authentication errors
            const paymentSpy = jest.spyOn(PaymentService, "createCheckoutSession").mockResolvedValue("https://checkout.stripe.com/test");

            const res = await request(app)
                .post("/api/payment/create-session")
                .send({ itemId });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("url", "https://checkout.stripe.com/test");

            jest.restoreAllMocks();
            paymentSpy.mockRestore();
        });
    });

    describe("Recommendations API", () => {
        it("should return recommended items", async () => {
            const buyer = await prisma.user.findFirst({ where: { role: "BUYER" } });
            const bid = buyer?.id || "test-user";

            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: bid, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app).get("/api/recommendations");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should return similar items", async () => {
            const item = await prisma.item.findFirst();
            if (!item) return;

            const res = await request(app).get(`/api/recommendations/similar/${item.id}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
});
