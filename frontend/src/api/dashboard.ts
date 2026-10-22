import { apiRequest } from './client';
import type { DashboardSummary } from '../types';

export function fetchDashboard(): Promise<{ dashboard: DashboardSummary }> {
  return apiRequest('/dashboard');
}
