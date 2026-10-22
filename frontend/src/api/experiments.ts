import { apiRequest } from './client';
import type { Experiment, ExperimentDetail, ExperimentObservation, ExperimentStatus } from '../types';

export function listExperiments(filter?: {
  cell_culture_id?: number;
  status?: ExperimentStatus;
}): Promise<{ experiments: Experiment[] }> {
  return apiRequest('/experiments', { query: filter });
}

export function getExperiment(id: number): Promise<{ experiment: ExperimentDetail }> {
  return apiRequest(`/experiments/${id}`);
}

export function createExperiment(input: {
  title: string;
  objective?: string | null;
  cell_culture_id: number;
  start_date: string;
}): Promise<{ experiment: Experiment }> {
  return apiRequest('/experiments', { method: 'POST', body: input });
}

export function updateExperiment(
  id: number,
  input: Partial<{
    title: string;
    objective: string | null;
    start_date: string;
    end_date: string | null;
    status: ExperimentStatus;
  }>,
): Promise<{ experiment: Experiment }> {
  return apiRequest(`/experiments/${id}`, { method: 'PUT', body: input });
}

export function deleteExperiment(id: number): Promise<void> {
  return apiRequest(`/experiments/${id}`, { method: 'DELETE' });
}

export function listObservations(experimentId: number): Promise<{ observations: ExperimentObservation[] }> {
  return apiRequest(`/experiments/${experimentId}/observations`);
}

export function createObservation(
  experimentId: number,
  input: { description: string; measurement_value?: number | null; measurement_unit?: string | null },
): Promise<{ observation: ExperimentObservation }> {
  return apiRequest(`/experiments/${experimentId}/observations`, { method: 'POST', body: input });
}

export function updateObservation(
  observationId: number,
  input: Partial<{ description: string; measurement_value: number | null; measurement_unit: string | null }>,
): Promise<{ observation: ExperimentObservation }> {
  return apiRequest(`/observations/${observationId}`, { method: 'PUT', body: input });
}

export function deleteObservation(observationId: number): Promise<void> {
  return apiRequest(`/observations/${observationId}`, { method: 'DELETE' });
}
