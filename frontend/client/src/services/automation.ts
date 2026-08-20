import { apiClient } from "./api";
import type { AutomationRule } from "@/types";

export const automationService = {
  async getRules(): Promise<AutomationRule[]> {
    return apiClient.get<AutomationRule[]>("/automation/rules");
  },

  async createRule(data: {
    name: string;
    triggerType: string;
    triggerValue: number;
    actionType: string;
    actionValue: string;
    isActive?: boolean;
  }): Promise<AutomationRule> {
    return apiClient.post<AutomationRule>("/automation/rules", data);
  },

  async deleteRule(id: string): Promise<void> {
    return apiClient.delete(`/automation/rules/${id}`);
  },

  async toggleRule(id: string, isActive: boolean): Promise<AutomationRule> {
    return apiClient.patch<AutomationRule>(`/automation/rules/${id}/toggle`, { isActive });
  },
};
