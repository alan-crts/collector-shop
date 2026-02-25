import { apiClient } from "./apiClient";

export interface Item {
    id: string;
    title: string;
    description: string;
    price: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    images: string[];
    sellerId: string;
    commissionFee?: number;
    seller?: {
        id: string;
        name: string;
        image: string | null;
    };
}

export async function fetchItems(status?: string): Promise<Item[]> {
    const endpoint = status ? `/items?status=${status}` : `/items`;
    return apiClient.get<Item[]>(endpoint);
}

export async function getItemById(id: string): Promise<Item> {
    return apiClient.get<Item>(`/items/${id}`);
}

export async function createItem(data: { title: string; description: string; price: number; images?: string[] }): Promise<Item> {
    return apiClient.post<Item>("/items", data);
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
