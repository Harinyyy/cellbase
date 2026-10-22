import { CellCulture, Incubator as IncubatorModel, IncubatorReading, plain } from '../../db/models';
import { nextId } from '../../db/db';

export type IncubatorStatus = 'operational' | 'maintenance' | 'out_of_order';
export const VALID_STATUSES: IncubatorStatus[] = ['operational', 'maintenance', 'out_of_order'];
const DEFAULT_STATUS: IncubatorStatus = 'operational';
export interface Incubator { id: number; name: string; target_temperature_c: string; target_co2_percent: string; target_humidity_percent: string | null; status: IncubatorStatus; created_at: string; }
export class IncubatorError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'IncubatorError'; this.statusCode = statusCode; } }
interface IncubatorInput { name?: string; target_temperature_c?: number; target_co2_percent?: number; target_humidity_percent?: number | null; status?: string; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function validate(input: IncubatorInput, required: boolean): void {
  if (required && (!input.name || !input.name.trim())) throw new IncubatorError('name is required', 400);
  if (input.name !== undefined && !input.name.trim()) throw new IncubatorError('name cannot be empty', 400);
  if (input.target_temperature_c !== undefined && !finite(input.target_temperature_c)) throw new IncubatorError('target_temperature_c must be a number', 400);
  if (input.target_co2_percent !== undefined && !finite(input.target_co2_percent)) throw new IncubatorError('target_co2_percent must be a number', 400);
  if (input.target_humidity_percent !== undefined && input.target_humidity_percent !== null && !finite(input.target_humidity_percent)) throw new IncubatorError('target_humidity_percent must be a number', 400);
  if (input.status !== undefined && !VALID_STATUSES.includes(input.status as IncubatorStatus)) throw new IncubatorError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
}
function shape(doc: any): Incubator { const x = plain<any>(doc); return { ...x, target_temperature_c: String(x.target_temperature_c), target_co2_percent: String(x.target_co2_percent), target_humidity_percent: x.target_humidity_percent == null ? null : String(x.target_humidity_percent) }; }

export async function createIncubator(input: IncubatorInput): Promise<Incubator> {
  validate(input, true);
  const doc = await IncubatorModel.create({ id: await nextId('incubators'), name: input.name!.trim(), target_temperature_c: input.target_temperature_c ?? 37, target_co2_percent: input.target_co2_percent ?? 5, target_humidity_percent: input.target_humidity_percent ?? null, status: input.status ?? DEFAULT_STATUS, created_at: new Date().toISOString() });
  return shape(doc);
}
export async function listIncubators(filter: { status?: string } = {}): Promise<Incubator[]> {
  if (filter.status !== undefined && !VALID_STATUSES.includes(filter.status as IncubatorStatus)) throw new IncubatorError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  return (await IncubatorModel.find(filter.status ? { status: filter.status } : {}).sort({ id: 1 }).lean()).map(shape);
}
export async function getIncubatorById(id: number): Promise<Incubator | null> { const doc = await IncubatorModel.findOne({ id }).lean(); return doc ? shape(doc) : null; }
export async function updateIncubator(id: number, input: IncubatorInput): Promise<Incubator> {
  validate(input, false);
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.target_temperature_c !== undefined) updates.target_temperature_c = input.target_temperature_c;
  if (input.target_co2_percent !== undefined) updates.target_co2_percent = input.target_co2_percent;
  if (input.target_humidity_percent !== undefined) updates.target_humidity_percent = input.target_humidity_percent;
  if (input.status !== undefined) updates.status = input.status;
  if (!Object.keys(updates).length) throw new IncubatorError('No valid fields provided to update', 400);
  const doc = await IncubatorModel.findOneAndUpdate({ id }, { $set: updates }, { new: true, runValidators: true }).lean();
  if (!doc) throw new IncubatorError('Incubator not found', 404);
  return shape(doc);
}
export async function deleteIncubator(id: number): Promise<void> {
  if (!await IncubatorModel.exists({ id })) throw new IncubatorError('Incubator not found', 404);
  await Promise.all([IncubatorModel.deleteOne({ id }), IncubatorReading.deleteMany({ incubator_id: id }), CellCulture.updateMany({ incubator_id: id }, { $set: { incubator_id: null } })]);
}
