import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import itemRoutes from "./routes/itemRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();
const port = 8000;

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

app.use(express.json());

app.use("/api/items", itemRoutes);
app.use("/api/upload", uploadRoutes);

app.listen(port, () => {
    console.log(`Better Auth app listening on port ${port}`);
});
