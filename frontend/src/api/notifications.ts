import client from "./client";
import type { Notification } from "../types";

export async function getNotifications(params?: { type?: string }): Promise<Notification[]> {
  const response = await client.get<Notification[]>("/notifications", { params });
  return response.data;
}

export async function markAsRead(id: number): Promise<void> {
  await client.put(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await client.put("/notifications/read-all");
}
