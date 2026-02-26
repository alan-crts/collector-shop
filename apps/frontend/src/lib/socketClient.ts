import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Replace with dynamic environment variable in production
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true, // Crucial for better-auth cookies to be sent along WebSocket handshake
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on("connect", () => {
            console.log("[Socket.io] Connected to server:", socket?.id);
        });

        socket.on("connect_error", (error) => {
            console.error("[Socket.io] Connection Error:", error.message);
        });

        socket.on("disconnect", (reason) => {
            console.warn(`[Socket.io] Disconnected: ${reason}`);
        });
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
