import { apiRequest } from './client';
import type { Incubator, IncubatorReading, IncubatorStatus } from '../types';

export function listIncubators(status?: IncubatorStatus): Promise<{ incubators: Incubator[] }> {
  return apiRequest('/incubators', { query: { status } });
}

export function getIncubator(id: number): Promise<{ incubator: Incubator }> {
  return apiRequest(`/incubators/${id}`);
}

export function createIncubator(input: {
  name: string;
  target_temperature_c?: number;
  target_co2_percent?: number;
  target_humidity_percent?: number | null;
  status?: IncubatorStatus;
}): Promise<{ incubator: Incubator }> {
  return apiRequest('/incubators', { method: 'POST', body: input });
}

export function updateIncubator(
  id: number,
  input: Partial<{
    name: string;
    target_temperature_c: number;
    target_co2_percent: number;
    target_humidity_percent: number | null;
    status: IncubatorStatus;
  }>,
): Promise<{ incubator: Incubator }> {
  return apiRequest(`/incubators/${id}`, { method: 'PUT', body: input });
}

export function deleteIncubator(id: number): Promise<void> {
  return apiRequest(`/incubators/${id}`, { method: 'DELETE' });
}

export function listReadings(incubatorId: number, limit = 30): Promise<{ readings: IncubatorReading[] }> {
  return apiRequest(`/incubators/${incubatorId}/readings`, { query: { limit } });
}

export function logReading(
  incubatorId: number,
  input: { temperature_c: number; co2_percent: number; humidity_percent?: number | null },
): Promise<{ reading: IncubatorReading }> {
  return apiRequest(`/incubators/${incubatorId}/readings`, { method: 'POST', body: input });
}
