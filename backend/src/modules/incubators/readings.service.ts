import { IncubatorReading as ReadingModel, plain } from '../../db/models';
import { nextId } from '../../db/db';
import { getIncubatorById, IncubatorError } from './incubators.service';

export interface IncubatorReading { id: number; incubator_id: number; temperature_c: string; co2_percent: string; humidity_percent: string | null; recorded_by: number | null; recorded_at: string; }
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
interface ReadingInput { temperature_c?: number; co2_percent?: number; humidity_percent?: number | null; }
function shape(doc: any): IncubatorReading { const x = plain<any>(doc); return { ...x, temperature_c: String(x.temperature_c), co2_percent: String(x.co2_percent), humidity_percent: x.humidity_percent == null ? null : String(x.humidity_percent) }; }
function validate(input: ReadingInput): void {
  if (typeof input.temperature_c !== 'number' || !Number.isFinite(input.temperature_c)) throw new IncubatorError('temperature_c is required and must be a number', 400);
  if (typeof input.co2_percent !== 'number' || !Number.isFinite(input.co2_percent)) throw new IncubatorError('co2_percent is required and must be a number', 400);
  if (input.humidity_percent !== undefined && input.humidity_percent !== null && (typeof input.humidity_percent !== 'number' || !Number.isFinite(input.humidity_percent))) throw new IncubatorError('humidity_percent must be a number', 400);
}
export async function createReading(incubatorId: number, input: ReadingInput, recordedBy: number | null): Promise<IncubatorReading> {
  validate(input);
  if (!await getIncubatorById(incubatorId)) throw new IncubatorError('Incubator not found', 404);
  const doc = await ReadingModel.create({ id: await nextId('incubator_readings'), incubator_id: incubatorId, temperature_c: input.temperature_c, co2_percent: input.co2_percent, humidity_percent: input.humidity_percent ?? null, recorded_by: recordedBy, recorded_at: new Date().toISOString() });
  return shape(doc);
}
export async function listReadings(incubatorId: number, limit?: number): Promise<IncubatorReading[]> {
  let effectiveLimit = DEFAULT_LIMIT;
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit <= 0) throw new IncubatorError('limit must be a positive integer', 400);
    effectiveLimit = Math.min(limit, MAX_LIMIT);
  }
  if (!await getIncubatorById(incubatorId)) throw new IncubatorError('Incubator not found', 404);
  return (await ReadingModel.find({ incubator_id: incubatorId }).sort({ recorded_at: -1 }).limit(effectiveLimit).lean()).map(shape);
}
