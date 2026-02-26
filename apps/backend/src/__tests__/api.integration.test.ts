import request from "supertest";
import { app } from "../app.js";
import { jest, describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import prisma from "../lib/prisma.js";
import { auth } from "../lib/auth.js";
import * as socketUtils from "../lib/socket.js";

describe("API Integration Tests", () => {

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

    describe("GET /api/items", () => {
        it("should return a list of items", async () => {
            const res = await request(app).get("/api/items");

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it("should return 404 for non-existent item", async () => {
            const res = await request(app).get("/api/items/non-existent-id");
            expect(res.status).toBe(404);
        });
    });

    describe("Authentication Middleware", () => {
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
            // Mock session for the sender
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
});
