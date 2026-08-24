import { apiClient } from "./api";
import type { Workflow, WorkflowExecution, ExecutionStats } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const workflowsService = {
  async getAll(): Promise<Workflow[]> {
    const res = await apiClient.get<ApiResponse<Workflow[]>>("/workflows");
    return res.data;
  },

  async getById(id: string): Promise<Workflow> {
    const res = await apiClient.get<ApiResponse<Workflow>>(`/workflows/${id}`);
    return res.data;
  },

  async create(data: {
    name: string;
    description?: string;
    triggerType: string;
    conditions?: Array<{ type: string; value: string | number; operator?: string }>;
    actions?: Array<{ type: string; name: string; value?: string; config?: Record<string, any> }>;
    isActive?: boolean;
  }): Promise<Workflow> {
    const res = await apiClient.post<ApiResponse<Workflow>>("/workflows", data);
    return res.data;
  },

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    triggerType: string;
    conditions: any[];
    actions: any[];
    isActive: boolean;
  }>): Promise<Workflow> {
    const res = await apiClient.put<ApiResponse<Workflow>>(`/workflows/${id}`, data);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/workflows/${id}`);
  },

  async toggle(id: string, isActive: boolean): Promise<Workflow> {
    const res = await apiClient.patch<ApiResponse<Workflow>>(`/workflows/${id}/toggle`, { isActive });
    return res.data;
  },

  async run(id: string): Promise<{ executed: number; failed: number; total: number; errors: string[] }> {
    const res = await apiClient.post<ApiResponse<{ executed: number; failed: number; total: number; errors: string[] }>>(`/workflows/${id}/run`);
    return res.data;
  },

  async getExecutions(limit?: number): Promise<WorkflowExecution[]> {
    const params = limit ? `?limit=${limit}` : "";
    const res = await apiClient.get<ApiResponse<WorkflowExecution[]>>(`/workflows/executions${params}`);
    return res.data;
  },

  async getStats(): Promise<ExecutionStats> {
    const res = await apiClient.get<ApiResponse<ExecutionStats>>("/workflows/stats");
    return res.data;
  },
};
