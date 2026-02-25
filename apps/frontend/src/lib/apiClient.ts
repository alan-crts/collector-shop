import { authClient } from "./auth-client";

export class ApiError extends Error {
    public status: number;
    public code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

/**
 * Helper to build the full URL.
 * Automatically handles server-side Docker internal networking vs client-side public URLs.
 */
function getBaseUrl() {
    if (typeof window === "undefined") {
        // Server-side
        return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    }
    // Client-side
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

/**
 * Generic API Client wrapping BetterAuth's $fetch for automatic session handling.
 */
export const apiClient = {
    async request<T>(endpoint: string, options?: RequestInit & { body?: unknown }): Promise<T> {
        const url = `${getBaseUrl()}/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

        // authClient.$fetch automatically includes credentials/cookies
        const res = await authClient.$fetch<any, any>(url, {
            method: options?.method || "GET",
            ...options,
            body: options?.body ? options.body : undefined,
        });

        if (res.error) {
            // BetterAuth normalizes errors but we can throw our custom ApiError for consistency
            throw new ApiError(
                res.error.message || "Une erreur est survenue lors de l'appel API",
                res.error.status || 500,
                res.error.code
            );
        }

        // We assume the backend always returns { data: T } or { message: string, data: T } on success
        // or just plain data if no wrapper. We try to extract `.data` if present, else return the raw response.
        if (res.data && 'data' in res.data) {
            return res.data.data as T;
        }

        return res.data as T;
    },

    get<T>(endpoint: string, options?: Omit<RequestInit, "body">) {
        return this.request<T>(endpoint, { ...options, method: "GET" });
    },

    post<T>(endpoint: string, data?: any, options?: Omit<RequestInit, "body">) {
        return this.request<T>(endpoint, { ...options, method: "POST", body: data });
    },

    put<T>(endpoint: string, data?: any, options?: Omit<RequestInit, "body">) {
        return this.request<T>(endpoint, { ...options, method: "PUT", body: data });
    },

    delete<T>(endpoint: string, options?: Omit<RequestInit, "body">) {
        return this.request<T>(endpoint, { ...options, method: "DELETE" });
    },
};
