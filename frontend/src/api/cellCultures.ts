import { apiRequest } from './client';
import type { CellCulture, CultureStatus, PassageRecord } from '../types';

export function listCellCultures(filter?: {
  status?: CultureStatus;
  incubator_id?: number;
}): Promise<{ cellCultures: CellCulture[] }> {
  return apiRequest('/cell-cultures', { query: filter });
}

export function getCellCulture(id: number): Promise<{ cellCulture: CellCulture }> {
  return apiRequest(`/cell-cultures/${id}`);
}

export function createCellCulture(input: {
  culture_name: string;
  cell_line: string;
  incubator_id?: number | null;
  status?: CultureStatus;
}): Promise<{ cellCulture: CellCulture }> {
  return apiRequest('/cell-cultures', { method: 'POST', body: input });
}

export function updateCellCulture(
  id: number,
  input: Partial<{
    culture_name: string;
    cell_line: string;
    incubator_id: number | null;
    status: CultureStatus;
  }>,
): Promise<{ cellCulture: CellCulture }> {
  return apiRequest(`/cell-cultures/${id}`, { method: 'PUT', body: input });
}

export function deleteCellCulture(id: number): Promise<void> {
  return apiRequest(`/cell-cultures/${id}`, { method: 'DELETE' });
}

export function listPassages(cellCultureId: number): Promise<{ passages: PassageRecord[] }> {
  return apiRequest(`/cell-cultures/${cellCultureId}/passages`);
}

export function logPassage(
  cellCultureId: number,
  input: { passage_number: number; passage_date: string; confluency_percent?: number | null; notes?: string | null },
): Promise<{ passage: PassageRecord }> {
  return apiRequest(`/cell-cultures/${cellCultureId}/passages`, { method: 'POST', body: input });
}
