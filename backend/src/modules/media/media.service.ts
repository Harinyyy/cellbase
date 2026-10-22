import { MediaBatch as MediaModel, plain } from '../../db/models';
import { nextId } from '../../db/db';

export interface MediaBatch { id: number; media_name: string; prepared_by: number | null; prepared_date: string; volume_prepared_ml: string; volume_remaining_ml: string; expiry_date: string | null; notes: string | null; created_at: string; }
export class MediaBatchError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'MediaBatchError'; this.statusCode = statusCode; } }
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function validDate(value: unknown): value is string { if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false; return !Number.isNaN(new Date(value).getTime()); }
function shape(doc: any): MediaBatch { const x = plain<any>(doc); return { ...x, volume_prepared_ml: String(x.volume_prepared_ml), volume_remaining_ml: String(x.volume_remaining_ml) }; }
export interface CreateMediaBatchInput { media_name?: string; prepared_date?: string; volume_prepared_ml?: number; expiry_date?: string | null; notes?: string | null; }
export interface UpdateMediaBatchInput { media_name?: string; prepared_date?: string; volume_prepared_ml?: number; volume_remaining_ml?: number; expiry_date?: string | null; notes?: string | null; }
export function validateCreate(i: CreateMediaBatchInput): void {
  if (!i.media_name?.trim()) throw new MediaBatchError('media_name is required', 400);
  if (!validDate(i.prepared_date)) throw new MediaBatchError('prepared_date is required and must be a valid date (YYYY-MM-DD)', 400);
  if (!finite(i.volume_prepared_ml) || i.volume_prepared_ml <= 0) throw new MediaBatchError('volume_prepared_ml is required and must be a number greater than 0', 400);
  if (i.expiry_date != null && !validDate(i.expiry_date)) throw new MediaBatchError('expiry_date must be a valid date (YYYY-MM-DD)', 400);
  if (i.notes != null && typeof i.notes !== 'string') throw new MediaBatchError('notes must be a string', 400);
}
function validateUpdate(i: UpdateMediaBatchInput): void {
  if (i.media_name !== undefined && !i.media_name.trim()) throw new MediaBatchError('media_name cannot be empty', 400);
  if (i.prepared_date !== undefined && !validDate(i.prepared_date)) throw new MediaBatchError('prepared_date must be a valid date (YYYY-MM-DD)', 400);
  if (i.volume_prepared_ml !== undefined && (!finite(i.volume_prepared_ml) || i.volume_prepared_ml <= 0)) throw new MediaBatchError('volume_prepared_ml must be greater than 0', 400);
  if (i.volume_remaining_ml !== undefined && (!finite(i.volume_remaining_ml) || i.volume_remaining_ml < 0)) throw new MediaBatchError('volume_remaining_ml must be greater than or equal to 0', 400);
  if (i.expiry_date != null && !validDate(i.expiry_date)) throw new MediaBatchError('expiry_date must be a valid date (YYYY-MM-DD)', 400);
  if (i.notes != null && typeof i.notes !== 'string') throw new MediaBatchError('notes must be a string', 400);
}
export async function createMediaBatch(input: CreateMediaBatchInput, preparedBy: number): Promise<MediaBatch> {
  validateCreate(input);
  const doc = await MediaModel.create({ id: await nextId('media_batches'), media_name: input.media_name!.trim(), prepared_by: preparedBy, prepared_date: input.prepared_date, volume_prepared_ml: input.volume_prepared_ml, volume_remaining_ml: input.volume_prepared_ml, expiry_date: input.expiry_date ?? null, notes: input.notes ?? null, created_at: new Date().toISOString() });
  return shape(doc);
}
export async function listMediaBatches(filter: { expiringSoon?: boolean } = {}): Promise<MediaBatch[]> {
  const query: Record<string, unknown> = {};
  if (filter.expiringSoon) { const upper = new Date(); upper.setDate(upper.getDate() + 7); query.expiry_date = { $ne: null, $lte: upper.toISOString().slice(0, 10) }; }
  return (await MediaModel.find(query).sort(filter.expiringSoon ? { expiry_date: 1, created_at: -1 } : { created_at: -1 }).lean()).map(shape);
}
export async function getMediaBatchById(id: number): Promise<MediaBatch | null> { const doc = await MediaModel.findOne({ id }).lean(); return doc ? shape(doc) : null; }
export async function updateMediaBatch(id: number, input: UpdateMediaBatchInput): Promise<MediaBatch> {
  validateUpdate(input);
  const updates: Record<string, unknown> = {};
  for (const field of ['media_name', 'prepared_date', 'volume_prepared_ml', 'volume_remaining_ml', 'expiry_date', 'notes'] as const) if (input[field] !== undefined) updates[field] = field === 'media_name' ? input[field]!.toString().trim() : input[field];
  if (!Object.keys(updates).length) throw new MediaBatchError('No valid fields provided to update', 400);
  const doc = await MediaModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  if (!doc) throw new MediaBatchError('Media batch not found', 404);
  return shape(doc);
}
