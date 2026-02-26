import { Server, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { auth } from "./auth.js";

// Keep track of connected users and their active socket IDs
export const connectedUsers = new Map<string, Set<string>>();

let io: Server;

export function initSocket(server: HTTPServer) {
    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || "http://localhost:3000",
                "https://collector-shop.local",
                "http://collector-shop.local"
            ],
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    // Authentication Middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) {
                return next(new Error("Authentication error: No cookies found"));
            }

            // Native Web Headers required by better-auth
            const headers = new Headers();
            headers.set('cookie', cookieHeader);
            if (socket.handshake.headers.authorization) {
                headers.set('authorization', socket.handshake.headers.authorization as string);
            }

            const sessionInfo = await auth.api.getSession({
                headers: headers
            });

            if (!sessionInfo || !sessionInfo.user) {
                return next(new Error("Authentication error: Invalid session"));
            }

            // Attach user profile to the socket instance for later use
            (socket as any).user = sessionInfo.user;
            next();
        } catch (error) {
            console.error("[Socket.io] Auth error:", error);
            next(new Error("Authentication error: Internal server error"));
        }
    });

    // Connection Handler
    io.on("connection", (socket: Socket) => {
        const user = (socket as any).user;
        const userId = user.id;

        console.log(`[Socket.io] User connected: ${userId} (Socket: ${socket.id})`);

        // Register the user's socket ID
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId)!.add(socket.id);

        // Listen for typing events to broadcast to receiver
        socket.on("typing", (data: { receiverId: string, itemId: string, isTyping: boolean }) => {
            const receiverSockets = connectedUsers.get(data.receiverId);
            if (receiverSockets) {
                receiverSockets.forEach(socketId => {
                    io.to(socketId).emit("typing", {
                        senderId: userId,
                        itemId: data.itemId,
                        isTyping: data.isTyping
                    });
                });
            }
        });

        // Cleanup on disconnect
        socket.on("disconnect", () => {
            console.log(`[Socket.io] User disconnected: ${userId} (Socket: ${socket.id})`);
            const userSockets = connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    connectedUsers.delete(userId);
                }
            }
        });
    });

    return io;
}

export function getIO(): Server {
    if (!io) {
        throw new Error("Socket.io has not been initialized yet!");
    }
    return io;
}
