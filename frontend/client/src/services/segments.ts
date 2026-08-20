import { apiClient } from "./api";
import type { Segment } from "@/types";

export const segmentsService = {
  async getAll(): Promise<Segment[]> {
    return apiClient.get<Segment[]>("/segments");
  },

  async create(data: Partial<Segment>): Promise<Segment> {
    return apiClient.post<Segment>("/segments", data);
  },

  async update(id: string, data: Partial<Segment>): Promise<Segment> {
    return apiClient.patch<Segment>(`/segments/${id}`, data);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete(`/segments/${id}`);
  },

  async autoSegment(): Promise<Segment[]> {
    return apiClient.post<Segment[]>("/segments/auto-segment");
  },
};
