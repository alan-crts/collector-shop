import { ItemController } from "../controllers/itemController.js";
import { ItemService } from "../services/itemService.js";
import { createRequest, createResponse } from "node-mocks-http";
import { jest, describe, it, expect, afterEach } from "@jest/globals";

// We spy on the service so no DB calls are actually made
describe("ItemController CRUD Operations", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("create (POST)", () => {
        it("should return 401 if unauthorized", async () => {
            const req = createRequest({
                method: "POST",
                url: "/api/items",
                body: { title: "Test", description: "Test description", price: 500, images: [] },
            });
            const res = createResponse();

            await ItemController.create(req, res);

            expect(res._getStatusCode()).toBe(401);
        });

        it("should create an item with APPROVED status (< 1000) when authorized", async () => {
            const mockCreate = jest
                .spyOn(ItemService, "createItem")
                .mockResolvedValueOnce({
                    id: "item1",
                    title: "Card",
                    description: "Rare card",
                    price: 500,
                    status: "APPROVED",
                    sellerId: "seller1",
                    images: ["test.jpg"],
                    commissionFee: 25,
                });

            const req = createRequest({
                method: "POST",
                url: "/api/items",
                body: { title: "Card", description: "Rare card", price: 500, images: ["test.jpg"] },
            });
            req.user = { id: "seller1", role: "SELLER" }; // mock authMiddleware injecting user
            const res = createResponse();

            await ItemController.create(req, res);

            expect(res._getStatusCode()).toBe(201);
            const data = JSON.parse(res._getData());
            expect(data.data.status).toBe("APPROVED");
            expect(data.data.commissionFee).toBe(25);
            expect(data.data.images).toEqual(["test.jpg"]);
            expect(mockCreate).toHaveBeenCalledWith("Card", "Rare card", 500, "seller1", ["test.jpg"]);
        });

        it("should return 400 on invalid input", async () => {
            const req = createRequest({
                method: "POST",
                url: "/api/items",
                body: { title: "Card" }, // missing price
            });
            req.user = { id: "seller1" };
            const res = createResponse();

            await ItemController.create(req, res);

            expect(res._getStatusCode()).toBe(400);
        });
    });

    describe("getAll (GET)", () => {
        it("should return all items", async () => {
            jest.spyOn(ItemService, "getItems").mockResolvedValueOnce([
                { id: "item1", title: "Card 1", description: "", price: 0, status: "APPROVED", sellerId: "", images: [] },
                { id: "item2", title: "Card 2", description: "", price: 0, status: "PENDING", sellerId: "", images: [] }
            ]);

            const req = createRequest({ method: "GET", url: "/api/items" });
            const res = createResponse();

            await ItemController.getAll(req, res);

            expect(res._getStatusCode()).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data.data.length).toBe(2);
        });
    });

    describe("getById (GET)", () => {
        it("should return 404 if item not found", async () => {
            jest.spyOn(ItemService, "getItemById").mockResolvedValueOnce(null);

            const req = createRequest({ method: "GET", url: "/api/items/999", params: { id: "999" } });
            const res = createResponse();

            await ItemController.getById(req, res);

            expect(res._getStatusCode()).toBe(404);
        });

        it("should return item if found", async () => {
            jest.spyOn(ItemService, "getItemById").mockResolvedValueOnce({
                id: "item1", title: "Card 1", description: "", price: 0, status: "APPROVED", sellerId: "", images: []
            });

            const req = createRequest({ method: "GET", url: "/api/items/item1", params: { id: "item1" } });
            const res = createResponse();

            await ItemController.getById(req, res);

            expect(res._getStatusCode()).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data.data.id).toBe("item1");
        });
    });

    describe("update (PUT)", () => {
        it("should return 404 if updating non-existent item", async () => {
            jest.spyOn(ItemService, "updateItem").mockResolvedValueOnce(null);

            const req = createRequest({
                method: "PUT",
                url: "/api/items/999",
                params: { id: "999" },
                body: { title: "Updated" }
            });
            req.user = { id: "seller1" };
            const res = createResponse();

            await ItemController.update(req, res);

            expect(res._getStatusCode()).toBe(404);
        });

        it("should update item and return 200", async () => {
            jest.spyOn(ItemService, "updateItem").mockResolvedValueOnce({
                id: "item1", title: "Updated", description: "", price: 0, status: "APPROVED", sellerId: "", images: []
            });

            const req = createRequest({
                method: "PUT",
                url: "/api/items/item1",
                params: { id: "item1" },
                body: { title: "Updated" }
            });
            req.user = { id: "seller1" };
            const res = createResponse();

            await ItemController.update(req, res);

            expect(res._getStatusCode()).toBe(200);
            const data = JSON.parse(res._getData());
            expect(data.data.title).toBe("Updated");
        });

        it("should return 403 on forbidden (wrong owner)", async () => {
            jest.spyOn(ItemService, "updateItem").mockRejectedValueOnce(new Error("Forbidden: You are not the owner of this item."));

            const req = createRequest({
                method: "PUT",
                url: "/api/items/item1",
                params: { id: "item1" },
                body: { title: "Updated" }
            });
            req.user = { id: "seller2" };
            const res = createResponse();

            await ItemController.update(req, res);

            expect(res._getStatusCode()).toBe(403);
        });
    });

    describe("delete (DELETE)", () => {
        it("should successfully delete an item (204)", async () => {
            jest.spyOn(ItemService, "deleteItem").mockResolvedValueOnce(true);

            const req = createRequest({
                method: "DELETE",
                url: "/api/items/item1",
                params: { id: "item1" }
            });
            req.user = { id: "seller1" };
            const res = createResponse();

            await ItemController.delete(req, res);

            expect(res._getStatusCode()).toBe(204);
        });

        it("should return 404 if item not found", async () => {
            jest.spyOn(ItemService, "deleteItem").mockResolvedValueOnce(false);

            const req = createRequest({
                method: "DELETE",
                url: "/api/items/999",
                params: { id: "999" }
            });
            req.user = { id: "seller1" };
            const res = createResponse();

            await ItemController.delete(req, res);

            expect(res._getStatusCode()).toBe(404);
        });
    });
});
