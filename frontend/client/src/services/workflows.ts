import { apiClient } from "./api";
import type { Workflow, WorkflowExecution, ExecutionStats } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const workflowsService = {
  async getAll(): Promise<Workflow[]> {
    return apiClient.get<Workflow[]>("/workflows");
  },

  async getById(id: string): Promise<Workflow> {
    return apiClient.get<Workflow>(`/workflows/${id}`);
  },

  async create(data: {
    name: string;
    description?: string;
    triggerType: string;
    conditions?: Array<{ type: string; value: string | number; operator?: string }>;
    actions?: Array<{ type: string; name: string; value?: string; config?: Record<string, any> }>;
    isActive?: boolean;
  }): Promise<Workflow> {
    return apiClient.post<Workflow>("/workflows", data);
  },

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    triggerType: string;
    conditions: any[];
    actions: any[];
    isActive: boolean;
  }>): Promise<Workflow> {
    return apiClient.put<Workflow>(`/workflows/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/workflows/${id}`);
  },

  async toggle(id: string, isActive: boolean): Promise<Workflow> {
    return apiClient.patch<Workflow>(`/workflows/${id}/toggle`, { isActive });
  },

  async run(id: string): Promise<{ executed: number; failed: number; total: number; errors: string[] }> {
    return apiClient.post<{ executed: number; failed: number; total: number; errors: string[] }>(`/workflows/${id}/run`);
  },

  async getExecutions(limit?: number): Promise<WorkflowExecution[]> {
    const params = limit ? `?limit=${limit}` : "";
    return apiClient.get<WorkflowExecution[]>(`/workflows/executions${params}`);
  },

  async getStats(): Promise<ExecutionStats> {
    return apiClient.get<ExecutionStats>("/workflows/stats");
  },
};
