import { apiClient } from '../config/api';
import { DashboardResponse } from '../types';
import { mapNoteRowFromApi } from './notes';

export class DashboardService {
  async getDashboard(): Promise<DashboardResponse> {
    const response = await apiClient.get('/dashboard') as { data: DashboardResponse & { recentNotes?: Record<string, unknown>[] } };
    const d = response.data;
    const raw = (d.recentNotes ?? []) as Record<string, unknown>[];
    return {
      ...d,
      recentNotes: raw.map((row) => mapNoteRowFromApi(row)),
    };
  }
}

export const dashboardService = new DashboardService();
