import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import prisma from "../lib/prisma.js";

// Extend Request interface to include the user
declare global {
    namespace Express {
        interface Request {
            user?: any;
            session?: any;
        }
    }
}

export const requireSeller = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session || !session.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userId = session.user.id;
        // We can also double check role from db or use session.user.role if better-auth includes it
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!dbUser || (dbUser.role !== "SELLER" && dbUser.role !== "ADMIN")) {
            res.status(403).json({ error: "Forbidden: Seller access required" });
            return;
        }

        req.user = session.user;
        req.session = session.session;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session || !session.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        req.user = session.user;
        req.session = session.session;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const requireAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session || !session.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const userId = session.user.id;
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!dbUser || dbUser.role !== "ADMIN") {
            res.status(403).json({ error: "Forbidden: Admin access required" });
            return;
        }

        req.user = session.user;
        req.user.role = dbUser.role; // make sure role is attached
        req.session = session.session;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
