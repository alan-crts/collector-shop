import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import itemRoutes from "./routes/itemRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import categoriesRoutes from "./routes/categoriesRoute.js";
import messageRoutes from "./routes/messageRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./lib/swagger.js";

const app = express();

app.set("trust proxy", true);

app.use(cors({
    origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://collector-shop.local",
        "http://collector-shop.local"
    ],
    credentials: true
}));

app.all("/api/auth/*path", toNodeHandler(auth));

// Mount payment routes BEFORE global express.json() so the webhook can get the raw body
app.use("/api/payment", paymentRoutes);

app.use(express.json());

app.use("/api/items", itemRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

export { app };
