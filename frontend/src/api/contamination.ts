import { apiRequest } from './client';
import type { ContaminationLog, ContaminationStatus } from '../types';

export function listContaminationLogs(filter?: {
  cell_culture_id?: number;
  status?: ContaminationStatus;
}): Promise<{ contaminationLogs: ContaminationLog[] }> {
  return apiRequest('/contamination-logs', { query: filter });
}

export function getContaminationLog(id: number): Promise<{ contaminationLog: ContaminationLog }> {
  return apiRequest(`/contamination-logs/${id}`);
}

export function reportContamination(input: {
  cell_culture_id: number;
  description: string;
}): Promise<{ contaminationLog: ContaminationLog }> {
  return apiRequest('/contamination-logs', { method: 'POST', body: input });
}

export function updateContaminationLog(
  id: number,
  input: Partial<{ description: string; resolution_notes: string | null; status: ContaminationStatus }>,
): Promise<{ contaminationLog: ContaminationLog }> {
  return apiRequest(`/contamination-logs/${id}`, { method: 'PUT', body: input });
}

export function deleteContaminationLog(id: number): Promise<void> {
  return apiRequest(`/contamination-logs/${id}`, { method: 'DELETE' });
}
