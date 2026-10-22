import { CellCulture as CultureModel, ContaminationLog as LogModel, plain } from '../../db/models';
import { nextId } from '../../db/db';

export type ContaminationStatus = 'open' | 'resolved';
export const VALID_STATUSES: ContaminationStatus[] = ['open', 'resolved'];
export interface ContaminationLog { id: number; cell_culture_id: number; reported_by: number | null; description: string; detected_at: string; resolution_notes: string | null; status: ContaminationStatus; }
export class ContaminationLogError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'ContaminationLogError'; this.statusCode = statusCode; } }
export interface CreateContaminationLogInput { cell_culture_id?: number; description?: string; }
export interface UpdateContaminationLogInput { description?: string; resolution_notes?: string | null; status?: string; }
function positive(v: unknown): v is number { return typeof v === 'number' && Number.isInteger(v) && v > 0; }
function validStatus(v: string): void { if (!VALID_STATUSES.includes(v as ContaminationStatus)) throw new ContaminationLogError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400); }
function validateCreate(i: CreateContaminationLogInput): void {
  if (!positive(i.cell_culture_id)) throw new ContaminationLogError('cell_culture_id is required and must be a positive integer', 400);
  if (!i.description?.trim()) throw new ContaminationLogError('description is required', 400);
}
function validateUpdate(i: UpdateContaminationLogInput): void {
  if (i.description !== undefined && !i.description.trim()) throw new ContaminationLogError('description cannot be empty', 400);
  if (i.resolution_notes != null && typeof i.resolution_notes !== 'string') throw new ContaminationLogError('resolution_notes must be a string', 400);
  if (i.status !== undefined) validStatus(i.status);
}
export async function createContaminationLog(input: CreateContaminationLogInput, reportedBy: number): Promise<ContaminationLog> {
  validateCreate(input);
  const culture = await CultureModel.findOne({ id: input.cell_culture_id });
  if (!culture) throw new ContaminationLogError('Referenced cell culture does not exist', 400);
  const doc = await LogModel.create({ id: await nextId('contamination_logs'), cell_culture_id: input.cell_culture_id, reported_by: reportedBy, description: input.description!.trim(), detected_at: new Date().toISOString(), resolution_notes: null, status: 'open' });
  try { culture.status = 'contaminated'; await culture.save(); }
  catch (err) { await LogModel.deleteOne({ id: doc.id }); throw err; }
  return plain<ContaminationLog>(doc);
}
export interface ListContaminationLogFilter { cellCultureId?: number; status?: string; }
export async function listContaminationLogs(filter: ListContaminationLogFilter = {}): Promise<ContaminationLog[]> {
  const q: Record<string, unknown> = {};
  if (filter.cellCultureId !== undefined) { if (!positive(filter.cellCultureId)) throw new ContaminationLogError('cell_culture_id filter must be a positive integer', 400); q.cell_culture_id = filter.cellCultureId; }
  if (filter.status !== undefined) { validStatus(filter.status); q.status = filter.status; }
  return (await LogModel.find(q).sort({ detected_at: -1 }).lean()).map((x) => plain<ContaminationLog>(x));
}
export async function getContaminationLogById(id: number): Promise<ContaminationLog | null> { const x = await LogModel.findOne({ id }).lean(); return x ? plain<ContaminationLog>(x) : null; }
export async function updateContaminationLog(id: number, input: UpdateContaminationLogInput): Promise<ContaminationLog> {
  validateUpdate(input);
  const update: Record<string, unknown> = {};
  if (input.description !== undefined) update.description = input.description.trim();
  if (input.resolution_notes !== undefined) update.resolution_notes = input.resolution_notes;
  if (input.status !== undefined) update.status = input.status;
  if (!Object.keys(update).length) throw new ContaminationLogError('No valid fields provided to update', 400);
  const x = await LogModel.findOneAndUpdate({ id }, { $set: update }, { new: true }).lean();
  if (!x) throw new ContaminationLogError('Contamination log not found', 404);
  return plain<ContaminationLog>(x);
}
export async function deleteContaminationLog(id: number): Promise<void> { if (!await LogModel.exists({ id })) throw new ContaminationLogError('Contamination log not found', 404); await LogModel.deleteOne({ id }); }
