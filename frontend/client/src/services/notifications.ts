import { apiClient } from "./api";
import type { Notification } from "@/types";

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const notificationsService = {
  async getAll(): Promise<NotificationsResponse> {
    return apiClient.get<NotificationsResponse>("/notifications");
  },

  async markRead(id: string): Promise<Notification> {
    return apiClient.patch<Notification>(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/notifications/mark-all-read");
  },
};
