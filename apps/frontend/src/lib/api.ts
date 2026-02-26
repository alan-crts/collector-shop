import { apiClient } from "./apiClient";

export interface Item {
    id: string;
    title: string;
    description: string;
    price: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    images: string[];
    sellerId: string;
    shippingCost?: number;
    commissionFee?: number;
    seller?: {
        id: string;
        name: string;
        image: string | null;
    };
}

export async function fetchItems(status?: string, sellerId?: string, categoryId?: string): Promise<Item[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (sellerId) params.append("sellerId", sellerId);
    if (categoryId) params.append("categoryId", categoryId);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<Item[]>(`/items${queryString}`);
}

export async function getItemById(id: string): Promise<Item> {
    return apiClient.get<Item>(`/items/${id}`);
}

export async function createItem(data: { title: string; description: string; price: number; images?: string[], categoryId?: string }): Promise<Item> {
    return apiClient.post<Item>("/items", data);
}

// Transactions
export interface Transaction {
    id: string;
    itemId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    commission: number;
    status: string;
    createdAt: string;
    item?: {
        id: string;
        title: string;
        price: number;
        images: string[];
    };
    buyer?: {
        id: string;
        name: string;
        image: string | null;
    };
    seller?: {
        id: string;
        name: string;
        image: string | null;
    };
}

export interface Review {
    id: string;
    rating: number;
    comment: string | null;
    reviewerId: string;
    revieweeId: string;
    createdAt: string;
    reviewer?: { id: string; name: string; image: string | null };
}

export async function fetchMyPurchases(): Promise<Transaction[]> {
    return apiClient.get<Transaction[]>("/transactions/purchases");
}

export async function fetchMySales(): Promise<Transaction[]> {
    return apiClient.get<Transaction[]>("/transactions/sales");
}

export async function fetchTransactionById(id: string): Promise<Transaction> {
    return apiClient.get<Transaction>(`/transactions/${id}`);
}

export async function fetchUserReviews(userId: string): Promise<{ reviews: Review[], summary: { average: number, count: number } }> {
    return apiClient.get<{ reviews: Review[], summary: { average: number, count: number } }>(`/reviews/user/${userId}`);
}

export async function createReview(data: { revieweeId: string, rating: number, comment?: string, transactionId: string }): Promise<Review> {
    return apiClient.post<Review>("/reviews", data);
}

export async function getPresignedUrl(filename: string, contentType: string): Promise<{ signedUrl: string, publicUrl: string }> {
    return apiClient.post<{ signedUrl: string, publicUrl: string }>("/upload/presigned-url", { filename, contentType });
}

export async function deleteItem(id: string): Promise<void> {
    return apiClient.delete<void>(`/items/${id}`);
}

export async function updateItemAsAdmin(id: string, updates: Partial<Item>): Promise<Item> {
    return apiClient.put<Item>(`/items/${id}`, updates);
}

// Admins
export interface User {
    id: string;
    email: string;
    name: string;
    role: "BUYER" | "SELLER" | "ADMIN";
    isBanned: boolean;
    createdAt: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
}

export async function fetchAllUsers(): Promise<User[]> {
    return apiClient.get<User[]>("/admin/users");
}

export async function toggleUserBan(userId: string, isBanned: boolean): Promise<User> {
    return apiClient.post<User>(`/admin/users/${userId}/ban`, { isBanned });
}

export async function fetchPendingItems(): Promise<Item[]> {
    return apiClient.get<Item[]>("/admin/items/pending");
}

export async function updateItemStatusByAdmin(id: string, status: "APPROVED" | "REJECTED"): Promise<Item> {
    return apiClient.post<Item>(`/admin/items/${id}/status`, { status });
}

export async function fetchCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>("/categories");
}

export async function fetchCategoriesAdmin(): Promise<Category[]> {
    return apiClient.get<Category[]>("/admin/categories");
}

export async function createCategory(data: { name: string, slug: string }): Promise<Category> {
    return apiClient.post<Category>("/admin/categories", data);
}

export async function deleteCategory(id: string): Promise<void> {
    await apiClient.delete<void>(`/admin/categories/${id}`);
}

// Recommendations
export async function fetchRecommendations(): Promise<Item[]> {
    return apiClient.get<Item[]>("/recommendations");
}

// User Profile
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: string;
    interests: Category[];
}

export async function fetchMyProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>("/users/profile");
}

export async function updateMyInterests(categoryIds: string[]): Promise<{ data: Category[] }> {
    return apiClient.put<{ data: Category[] }>("/users/interests", { categoryIds });
}

export interface PublicProfile {
    id: string;
    name: string;
    image: string | null;
    createdAt: string;
    salesCount: number;
}

export async function getUserPublicProfile(userId: string): Promise<PublicProfile> {
    return apiClient.get<PublicProfile>(`/users/${userId}/public`);
}

// Messaging (Phase 12 & Phase 11)
export interface Message {
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    itemId: string | null;
    isRead: boolean;
    createdAt: string;
    type: "TEXT" | "OFFER";
    offerPrice?: number | null;
    offerStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null;
    sender: {
        id: string;
        name: string;
        image: string | null;
    };
    item?: {
        id: string;
        title: string;
        sellerId?: string;
        status?: string;
    } | null;
}

export interface Conversation {
    partnerId: string;
    partnerName: string;
    partnerImage: string | null;
    item: {
        id: string;
        title: string;
        images: string[];
        sellerId?: string;
        status?: string;
    } | null;
    latestMessage: string;
    latestMessageAt: string;
    latestMessageType?: "TEXT" | "OFFER";
    latestOfferPrice?: number | null;
    latestOfferStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null;
    unreadCount: number;
}

export async function fetchConversations(): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>("/messages/conversations");
}

export async function fetchMessageHistory(partnerId: string, itemId?: string): Promise<Message[]> {
    const params = new URLSearchParams();
    params.append("partnerId", partnerId);
    if (itemId) params.append("itemId", itemId);

    return apiClient.get<Message[]>(`/messages/history?${params.toString()}`);
}

export async function sendMessage(receiverId: string, content: string, itemId?: string): Promise<Message> {
    return apiClient.post<Message>("/messages", { receiverId, content, itemId });
}

export async function markMessagesAsRead(messageIds: string[]): Promise<{ message: string, count: number }> {
    return apiClient.post<{ message: string, count: number }>("/messages/read", { messageIds });
}

export async function sendOffer(receiverId: string, itemId: string, offerPrice: number): Promise<Message> {
    return apiClient.post<Message>("/messages/offer", { receiverId, itemId, offerPrice });
}

export const respondToOffer = async (messageId: string, action: "ACCEPTED" | "REJECTED"): Promise<any> => {
    try {
        const data = await apiClient.post<any>(`/messages/offer/${messageId}/respond`, { action });
        // The backend returns { data: ... }
        return data.data || data;
    } catch (error) {
        console.error("Erreur respondToOffer:", error);
        throw error;
    }
};

/**
 * Payments & Stripe
 */
export const createCheckoutSession = async (itemId: string, offerId?: string): Promise<{ url: string }> => {
    try {
        const data = await apiClient.post<{ url: string }>('/payment/create-session', { itemId, offerId });
        return data;
    } catch (error) {
        console.error("Erreur createCheckoutSession:", error);
        throw error;
    }
};

// Notifications (Phase 12)
export interface Notification {
    id: string;
    type: "MESSAGE" | "OFFER_RECEIVED" | "ORDER_STATUS" | "SYSTEM_ALERT";
    title: string;
    content: string;
    isRead: boolean;
    userId: string;
    link?: string;
    createdAt: string;
}

export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
    return apiClient.get<Notification[]>(`/notifications?unread=${unreadOnly}`);
}

export async function fetchUnreadCounts(): Promise<{ notifications: number, messages: number, total: number }> {
    return apiClient.get<{ notifications: number, messages: number, total: number }>("/notifications/unread-counts");
}

export async function markNotificationsAsRead(notificationIds?: string[]): Promise<{ message: string, count: number }> {
    return apiClient.post<{ message: string, count: number }>("/notifications/read", { notificationIds });
}
