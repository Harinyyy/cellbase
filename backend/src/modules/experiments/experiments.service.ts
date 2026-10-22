import { CellCulture, Experiment as ExperimentModel, plain } from '../../db/models';
import { nextId } from '../../db/db';

export type ExperimentStatus = 'ongoing' | 'completed' | 'aborted';
export const VALID_STATUSES: ExperimentStatus[] = ['ongoing', 'completed', 'aborted'];
export interface Experiment { id: number; title: string; objective: string | null; cell_culture_id: number; start_date: string; end_date: string | null; status: ExperimentStatus; created_by: number | null; created_at: string; }
export interface ExperimentWithObservationCount extends Experiment { observation_count: number; }
export class ExperimentError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'ExperimentError'; this.statusCode = statusCode; } }
const DATE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(v: unknown): v is string { return typeof v === 'string' && DATE.test(v) && !Number.isNaN(new Date(v).getTime()); }
function positive(v: unknown): v is number { return typeof v === 'number' && Number.isInteger(v) && v > 0; }
function validStatus(v: string): void { if (!VALID_STATUSES.includes(v as ExperimentStatus)) throw new ExperimentError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400); }
export interface CreateExperimentInput { title?: string; objective?: string | null; cell_culture_id?: number; start_date?: string; }
export interface UpdateExperimentInput { title?: string; objective?: string | null; start_date?: string; end_date?: string | null; status?: string; }
function validateCreate(i: CreateExperimentInput): void {
  if (!i.title?.trim()) throw new ExperimentError('title is required', 400);
  if (!positive(i.cell_culture_id)) throw new ExperimentError('cell_culture_id is required and must be a positive integer', 400);
  if (!validDate(i.start_date)) throw new ExperimentError('start_date is required and must be a valid date (YYYY-MM-DD)', 400);
  if (i.objective != null && typeof i.objective !== 'string') throw new ExperimentError('objective must be a string', 400);
}
function validateUpdate(i: UpdateExperimentInput): void {
  if (i.title !== undefined && !i.title.trim()) throw new ExperimentError('title cannot be empty', 400);
  if (i.objective != null && typeof i.objective !== 'string') throw new ExperimentError('objective must be a string', 400);
  if (i.start_date !== undefined && !validDate(i.start_date)) throw new ExperimentError('start_date must be a valid date (YYYY-MM-DD)', 400);
  if (i.end_date != null && !validDate(i.end_date)) throw new ExperimentError('end_date must be a valid date (YYYY-MM-DD)', 400);
  if (i.status !== undefined) validStatus(i.status);
}
export async function createExperiment(input: CreateExperimentInput, createdBy: number): Promise<Experiment> {
  validateCreate(input);
  if (!await CellCulture.exists({ id: input.cell_culture_id })) throw new ExperimentError('Referenced cell culture does not exist', 400);
  const doc = await ExperimentModel.create({ id: await nextId('experiments'), title: input.title!.trim(), objective: input.objective ?? null, cell_culture_id: input.cell_culture_id, start_date: input.start_date, end_date: null, status: 'ongoing', created_by: createdBy, created_at: new Date().toISOString(), observations: [] });
  return plain<Experiment>(doc);
}
export interface ListExperimentFilter { cellCultureId?: number; status?: string; }
export async function listExperiments(filter: ListExperimentFilter = {}): Promise<Experiment[]> {
  const q: Record<string, unknown> = {};
  if (filter.cellCultureId !== undefined) { if (!positive(filter.cellCultureId)) throw new ExperimentError('cell_culture_id filter must be a positive integer', 400); q.cell_culture_id = filter.cellCultureId; }
  if (filter.status !== undefined) { validStatus(filter.status); q.status = filter.status; }
  return (await ExperimentModel.find(q).sort({ start_date: -1, created_at: -1 }).lean()).map((x) => plain<Experiment>(x));
}
export async function getExperimentById(id: number): Promise<ExperimentWithObservationCount | null> {
  const x = await ExperimentModel.findOne({ id }).lean();
  return x ? { ...plain<Experiment>(x), observation_count: (x.observations ?? []).length } : null;
}
export async function updateExperiment(id: number, input: UpdateExperimentInput): Promise<Experiment> {
  validateUpdate(input);
  const q: Record<string, unknown> = {};
  if (input.title !== undefined) q.title = input.title.trim();
  if (input.objective !== undefined) q.objective = input.objective;
  if (input.start_date !== undefined) q.start_date = input.start_date;
  if (input.end_date !== undefined) q.end_date = input.end_date;
  if (input.status !== undefined) q.status = input.status;
  if (!Object.keys(q).length) throw new ExperimentError('No valid fields provided to update', 400);
  const x = await ExperimentModel.findOneAndUpdate({ id }, { $set: q }, { new: true }).lean();
  if (!x) throw new ExperimentError('Experiment not found', 404);
  return plain<Experiment>(x);
}
export async function deleteExperiment(id: number): Promise<void> { if (!await ExperimentModel.exists({ id })) throw new ExperimentError('Experiment not found', 404); await ExperimentModel.deleteOne({ id }); }
