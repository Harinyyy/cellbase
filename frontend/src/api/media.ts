import { apiRequest } from './client';
import type { MediaBatch } from '../types';

export function listMediaBatches(expiringSoon?: boolean): Promise<{ mediaBatches: MediaBatch[] }> {
  return apiRequest('/media-batches', { query: { expiring_soon: expiringSoon } });
}

export function getMediaBatch(id: number): Promise<{ mediaBatch: MediaBatch }> {
  return apiRequest(`/media-batches/${id}`);
}

export function createMediaBatch(input: {
  media_name: string;
  prepared_date: string;
  volume_prepared_ml: number;
  expiry_date?: string | null;
  notes?: string | null;
}): Promise<{ mediaBatch: MediaBatch }> {
  return apiRequest('/media-batches', { method: 'POST', body: input });
}

export function updateMediaBatch(
  id: number,
  input: Partial<{
    media_name: string;
    prepared_date: string;
    volume_prepared_ml: number;
    volume_remaining_ml: number;
    expiry_date: string | null;
    notes: string | null;
  }>,
): Promise<{ mediaBatch: MediaBatch }> {
  return apiRequest(`/media-batches/${id}`, { method: 'PUT', body: input });
}
