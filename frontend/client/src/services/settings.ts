import { apiClient } from "./api";
import type { UserSettings } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const settingsService = {
  async get(): Promise<UserSettings> {
    const res = await apiClient.get<UserSettings>("/settings");
    return res;
  },

  async update(data: Partial<UserSettings>): Promise<UserSettings> {
    const res = await apiClient.put<UserSettings>("/settings", data);
    return res;
  },
};
