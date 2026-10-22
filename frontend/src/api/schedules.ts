import { apiRequest } from './client';
import type { CultureSchedule, ScheduleStatus, TaskType } from '../types';

export function listSchedules(filter?: {
  cell_culture_id?: number;
  status?: ScheduleStatus;
  task_type?: TaskType;
  assigned_to?: number;
  scheduled_from?: string;
  scheduled_to?: string;
}): Promise<{ schedules: CultureSchedule[] }> {
  return apiRequest('/culture-schedules', { query: filter });
}

export function getSchedule(id: number): Promise<{ schedule: CultureSchedule }> {
  return apiRequest(`/culture-schedules/${id}`);
}

export function createSchedule(input: {
  cell_culture_id: number;
  task_type: TaskType;
  scheduled_date: string;
  assigned_to?: number | null;
  notes?: string | null;
}): Promise<{ schedule: CultureSchedule }> {
  return apiRequest('/culture-schedules', { method: 'POST', body: input });
}

export function updateSchedule(
  id: number,
  input: Partial<{
    task_type: TaskType;
    scheduled_date: string;
    assigned_to: number | null;
    status: ScheduleStatus;
    notes: string | null;
  }>,
): Promise<{ schedule: CultureSchedule }> {
  return apiRequest(`/culture-schedules/${id}`, { method: 'PUT', body: input });
}

export function deleteSchedule(id: number): Promise<void> {
  return apiRequest(`/culture-schedules/${id}`, { method: 'DELETE' });
}
