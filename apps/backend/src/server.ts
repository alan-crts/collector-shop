import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import itemRoutes from "./routes/itemRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();
const port = 8000;

app.set("trust proxy", true);

app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        console.log(`[DEBUG] Response: ${res.statusCode} - Set-Cookie:`, res.get("Set-Cookie"));
        return originalSend.apply(res, arguments as any);
    };

    console.log(`[DEBUG] Request: ${req.method} ${req.url} - Proto: ${req.protocol} - Headers:`, {
        host: req.headers.host,
        origin: req.headers.origin,
        "x-forwarded-proto": req.headers["x-forwarded-proto"]
    });
    next();
});

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
