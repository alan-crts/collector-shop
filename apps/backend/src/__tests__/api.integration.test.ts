import request from "supertest";
import { app } from "../app.js";
import { jest, describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import prisma from "../lib/prisma.js";
import { auth } from "../lib/auth.js";
import * as socketUtils from "../lib/socket.js";
import { PaymentService } from "../services/paymentService.js";

// ─── Global test state created once for all suites ───────────────────────────
let adminId: string;
let sellerId: string;
let buyerId: string;
let categoryId: string;

describe("API Integration Tests", () => {

    beforeAll(async () => {
        await prisma.$connect();

        // Initialize Socket.io with a dummy server to avoid "not initialized" errors
        const { createServer } = await import("http");
        const dummyServer = createServer();
        socketUtils.initSocket(dummyServer);

        // ── Ensure a category exists ──────────────────────────────────────────
        let category = await prisma.category.findFirst();
        if (!category) {
            category = await prisma.category.create({
                data: { name: "Test Category", slug: "test-category" }
            });
        }
        categoryId = category.id;

        // ── Ensure an ADMIN user exists ───────────────────────────────────────
        let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
        if (!admin) {
            admin = await prisma.user.create({
                data: { email: "ci_admin@test.com", name: "CI Admin", role: "ADMIN" }
            });
        }
        adminId = admin.id;

        // ── Ensure a SELLER user exists ───────────────────────────────────────
        let seller = await prisma.user.findFirst({ where: { role: "SELLER" } });
        if (!seller) {
            seller = await prisma.user.create({
                data: { email: "ci_seller@test.com", name: "CI Seller", role: "SELLER" }
            });
        }
        sellerId = seller.id;

        // ── Ensure a BUYER user exists ────────────────────────────────────────
        let buyer = await prisma.user.findFirst({ where: { role: "BUYER" } });
        if (!buyer) {
            buyer = await prisma.user.create({
                data: { email: "ci_buyer@test.com", name: "CI Buyer", role: "BUYER" }
            });
        }
        buyerId = buyer.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    // ── Categories ──────────────────────────────────────────────────────────────
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

    // ── Items API ───────────────────────────────────────────────────────────────
    describe("Items API", () => {
        let itemId: string;

        beforeAll(async () => {
            // Create a test item to use for read/update/delete tests
            const item = await prisma.item.create({
                data: {
                    title: "CRUD Test Item",
                    description: "Original description",
                    price: 100,
                    sellerId: sellerId,
                    categoryId: categoryId
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
            expect(res.status).toBe(204);

            const check = await prisma.item.findUnique({ where: { id: itemId } });
            expect(check).toBeNull();
            jest.restoreAllMocks();
        });
    });

    // ── Authentication Middleware & Errors ──────────────────────────────────────
    describe("Authentication Middleware & Errors", () => {
        it("should return 401 when trying to create an item without token", async () => {
            const res = await request(app)
                .post("/api/items")
                .send({
                    title: "Integration Test Item",
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

    // ── Messaging API ───────────────────────────────────────────────────────────
    describe("Messaging API (US-002)", () => {
        it("should allow an authenticated user to send a message", async () => {
            const spy = jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, email: "ci_buyer@test.com", role: "BUYER" },
                session: { id: "test-session", expiresAt: new Date(Date.now() + 1000 * 60) }
            } as any);

            const res = await request(app)
                .post("/api/messages")
                .send({
                    receiverId: sellerId,
                    content: "Hello, is this item still available?"
                });

            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty("content", "Hello, is this item still available?");
            expect(res.body.data).toHaveProperty("receiverId", sellerId);
            expect(res.body.data).toHaveProperty("senderId", buyerId);

            spy.mockRestore();
        });

        it("should return 400 if content is empty", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId },
                session: {}
            } as any);

            const res = await request(app)
                .post("/api/messages")
                .send({ receiverId: sellerId, content: "" });

            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });
    });

    // ── Admin API ───────────────────────────────────────────────────────────────
    describe("Admin API", () => {
        let testItemId: string;
        let newCategoryId: string;

        beforeAll(async () => {
            const item = await prisma.item.create({
                data: {
                    title: "Admin Test Item",
                    description: "Pending for admin review",
                    price: 75,
                    sellerId: sellerId,
                    categoryId: categoryId,
                    status: "PENDING"
                }
            });
            testItemId = item.id;
        });

        const adminMock = () => jest.spyOn(auth.api, "getSession").mockResolvedValue({
            user: { id: adminId, role: "ADMIN" },
            session: {}
        } as any);

        it("should allow an admin to list users", async () => {
            adminMock();
            const res = await request(app).get("/api/admin/users");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should forbid non-admins from accessing admin routes", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);
            const res = await request(app).get("/api/admin/users");
            expect(res.status).toBe(403);
            jest.restoreAllMocks();
        });

        it("should allow an admin to ban a user", async () => {
            adminMock();
            const res = await request(app)
                .post(`/api/admin/users/${buyerId}/ban`)
                .send({ isBanned: true });
            expect(res.status).toBe(200);
            jest.restoreAllMocks();

            // Unban immediately to not break other tests
            adminMock();
            await request(app)
                .post(`/api/admin/users/${buyerId}/ban`)
                .send({ isBanned: false });
            jest.restoreAllMocks();
        });

        it("should return 400 for invalid ban payload", async () => {
            adminMock();
            const res = await request(app)
                .post(`/api/admin/users/${buyerId}/ban`)
                .send({ isBanned: "not-a-boolean" });
            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });

        it("should allow an admin to list pending items", async () => {
            adminMock();
            const res = await request(app).get("/api/admin/items/pending");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should allow an admin to approve an item", async () => {
            adminMock();
            const res = await request(app)
                .post(`/api/admin/items/${testItemId}/status`)
                .send({ status: "APPROVED" });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("status", "APPROVED");
            jest.restoreAllMocks();
        });

        it("should return 400 for invalid item status", async () => {
            adminMock();
            const res = await request(app)
                .post(`/api/admin/items/${testItemId}/status`)
                .send({ status: "INVALID_STATUS" });
            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });

        it("should allow an admin to list categories", async () => {
            adminMock();
            const res = await request(app).get("/api/admin/categories");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should allow an admin to create a category", async () => {
            adminMock();
            const res = await request(app)
                .post("/api/admin/categories")
                .send({ name: "New Test Category", slug: `new-test-cat-${Date.now()}` });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("name", "New Test Category");
            newCategoryId = res.body.id;
            jest.restoreAllMocks();
        });

        it("should return 400 when creating category without required fields", async () => {
            adminMock();
            const res = await request(app)
                .post("/api/admin/categories")
                .send({ name: "Missing slug" });
            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });

        it("should allow an admin to delete a category", async () => {
            if (!newCategoryId) return;
            adminMock();
            const res = await request(app).delete(`/api/admin/categories/${newCategoryId}`);
            expect(res.status).toBe(204);
            jest.restoreAllMocks();
        });
    });

    // ── User API ────────────────────────────────────────────────────────────────
    describe("User API", () => {
        it("should return the authenticated user's profile", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app).get("/api/users/profile");
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("id", buyerId);
            jest.restoreAllMocks();
        });

        it("should return 401 for profile without auth", async () => {
            const res = await request(app).get("/api/users/profile");
            expect(res.status).toBe(401);
        });

        it("should return a public user profile", async () => {
            const res = await request(app).get(`/api/users/${sellerId}/public`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("id", sellerId);
            expect(res.body).toHaveProperty("salesCount");
        });

        it("should return 404 for non-existent public profile", async () => {
            const res = await request(app).get("/api/users/non-existent-user/public");
            expect(res.status).toBe(404);
        });

        it("should update user interests", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app)
                .put("/api/users/interests")
                .send({ categoryIds: [categoryId] });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("message");
            expect(Array.isArray(res.body.data)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should return 400 for invalid interests payload", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app)
                .put("/api/users/interests")
                .send({ categoryIds: "not-an-array" });

            expect(res.status).toBe(400);
            jest.restoreAllMocks();
        });
    });

    // ── Notifications API ───────────────────────────────────────────────────────
    describe("Notifications API", () => {
        const buyerMock = () => jest.spyOn(auth.api, "getSession").mockResolvedValue({
            user: { id: buyerId, role: "BUYER" },
            session: {}
        } as any);

        it("should return notifications for authenticated user", async () => {
            buyerMock();
            const res = await request(app).get("/api/notifications");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should return unread notification counts", async () => {
            buyerMock();
            const res = await request(app).get("/api/notifications/unread-counts");
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("notifications");
            expect(res.body.data).toHaveProperty("messages");
            expect(res.body.data).toHaveProperty("total");
            jest.restoreAllMocks();
        });

        it("should mark all notifications as read", async () => {
            buyerMock();
            const res = await request(app).post("/api/notifications/read").send({});
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("message");
            jest.restoreAllMocks();
        });

        it("should mark specific notifications as read", async () => {
            const notif = await prisma.notification.create({
                data: {
                    userId: buyerId,
                    content: "Test notification content",
                    type: "SYSTEM"
                }
            });

            buyerMock();
            const res = await request(app)
                .post("/api/notifications/read")
                .send({ notificationIds: [notif.id] });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("count");
            jest.restoreAllMocks();
        });

        it("should return 401 for notifications without auth", async () => {
            const res = await request(app).get("/api/notifications");
            expect(res.status).toBe(401);
        });
    });

    // ── Transactions API ────────────────────────────────────────────────────────
    describe("Transactions API", () => {
        let transactionId: string;

        beforeAll(async () => {
            const item = await prisma.item.create({
                data: {
                    title: "Transaction Test Item",
                    description: "For transaction tests",
                    price: 200,
                    sellerId: sellerId,
                    categoryId: categoryId
                }
            });

            const tx = await prisma.transaction.create({
                data: {
                    buyerId: buyerId,
                    sellerId: sellerId,
                    itemId: item.id,
                    amount: 200,
                    commission: 20,
                    status: "COMPLETED"
                }
            });
            transactionId = tx.id;
        });

        it("should return buyer purchase history", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app).get("/api/transactions/purchases");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should return seller sales history", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: sellerId, role: "SELLER" },
                session: {}
            } as any);

            const res = await request(app).get("/api/transactions/sales");
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            jest.restoreAllMocks();
        });

        it("should return a specific transaction by ID", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app).get(`/api/transactions/${transactionId}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("id", transactionId);
            jest.restoreAllMocks();
        });

        it("should return 404 for non-existent transaction", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            const res = await request(app).get("/api/transactions/non-existent-id");
            expect(res.status).toBe(404);
            jest.restoreAllMocks();
        });

        it("should return 401 for purchases without auth", async () => {
            const res = await request(app).get("/api/transactions/purchases");
            expect(res.status).toBe(401);
        });
    });

    // ── Reviews API ─────────────────────────────────────────────────────────────
    describe("Reviews API", () => {
        let transactionId: string;

        beforeAll(async () => {
            // Create a test item for the transaction
            const item = await prisma.item.create({
                data: {
                    title: "Review Test Item",
                    description: "Test description for review",
                    price: 50,
                    sellerId: sellerId,
                    categoryId: categoryId
                }
            });

            // Find or create a COMPLETED transaction
            let transaction = await prisma.transaction.findFirst({
                where: { status: "COMPLETED", buyerId: buyerId, sellerId: sellerId }
            });

            if (!transaction) {
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

            // Clean up any existing review for this transaction to avoid "already reviewed" error
            await prisma.review.deleteMany({ where: { transactionId: transaction.id } });

            transactionId = transaction.id;
        });

        it("should return reviews for a specific user", async () => {
            const res = await request(app).get(`/api/reviews/user/${sellerId}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty("reviews");
            expect(Array.isArray(res.body.data.reviews)).toBe(true);
        });

        it("should allow creating a review if authenticated", async () => {
            if (!transactionId) return;

            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId },
                session: {}
            } as any);

            const res = await request(app)
                .post("/api/reviews")
                .send({
                    revieweeId: sellerId,
                    rating: 5,
                    comment: "Excellent service!",
                    transactionId: transactionId
                });

            if (res.status !== 201) {
                console.log("Review Creation Failed Body:", res.body);
            }
            expect(res.status).toBe(201);
            expect(res.body.data).toHaveProperty("rating", 5);
            jest.restoreAllMocks();
        });
    });

    // ── Payment API ─────────────────────────────────────────────────────────────
    describe("Payment API", () => {
        it("should return a Stripe session for checkout", async () => {
            // Find any item to buy
            const item = await prisma.item.findFirst();
            if (!item) return;

            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
                session: {}
            } as any);

            // Mock PaymentService to avoid hitting actual Stripe in CI
            const paymentSpy = jest.spyOn(PaymentService, "createCheckoutSession")
                .mockResolvedValue("https://checkout.stripe.com/test");

            const res = await request(app)
                .post("/api/payment/create-session")
                .send({ itemId: item.id });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("url", "https://checkout.stripe.com/test");

            paymentSpy.mockRestore();
            jest.restoreAllMocks();
        });
    });

    // ── Recommendations API ─────────────────────────────────────────────────────
    describe("Recommendations API", () => {
        it("should return recommended items", async () => {
            jest.spyOn(auth.api, "getSession").mockResolvedValue({
                user: { id: buyerId, role: "BUYER" },
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
