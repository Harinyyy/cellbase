import { CellCulture, CultureSchedule as ScheduleModel, User, plain } from '../../db/models';
import { nextId } from '../../db/db';

export type TaskType = 'feed' | 'passage' | 'media_change' | 'check' | 'other';
export const VALID_TASK_TYPES: TaskType[] = ['feed', 'passage', 'media_change', 'check', 'other'];
export type ScheduleStatus = 'pending' | 'completed' | 'missed';
export const VALID_STATUSES: ScheduleStatus[] = ['pending', 'completed', 'missed'];
export interface CultureSchedule { id: number; cell_culture_id: number; task_type: TaskType; scheduled_date: string; assigned_to: number | null; status: ScheduleStatus; notes: string | null; created_at: string; }
export class CultureScheduleError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'CultureScheduleError'; this.statusCode = statusCode; } }
const ISO = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
function dateTime(v: unknown): v is string { return typeof v === 'string' && ISO.test(v.trim()) && !Number.isNaN(new Date(v).getTime()); }
function positive(v: unknown): v is number { return typeof v === 'number' && Number.isInteger(v) && v > 0; }
function task(v: string): void { if (!VALID_TASK_TYPES.includes(v as TaskType)) throw new CultureScheduleError(`task_type must be one of: ${VALID_TASK_TYPES.join(', ')}`, 400); }
function status(v: string): void { if (!VALID_STATUSES.includes(v as ScheduleStatus)) throw new CultureScheduleError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400); }
export interface CreateScheduleInput { cell_culture_id?: number; task_type?: string; scheduled_date?: string; assigned_to?: number | null; notes?: string | null; }
export interface UpdateScheduleInput { task_type?: string; scheduled_date?: string; assigned_to?: number | null; status?: string; notes?: string | null; }
function validateCreate(i: CreateScheduleInput): void {
  if (!positive(i.cell_culture_id)) throw new CultureScheduleError('cell_culture_id is required and must be a positive integer', 400);
  if (!i.task_type) throw new CultureScheduleError('task_type is required', 400); task(i.task_type);
  if (!dateTime(i.scheduled_date)) throw new CultureScheduleError('scheduled_date is required and must be a valid date/time', 400);
  if (i.assigned_to != null && !positive(i.assigned_to)) throw new CultureScheduleError('assigned_to must be a positive integer', 400);
  if (i.notes != null && typeof i.notes !== 'string') throw new CultureScheduleError('notes must be a string', 400);
}
function validateUpdate(i: UpdateScheduleInput): void {
  if (i.task_type !== undefined) task(i.task_type);
  if (i.scheduled_date !== undefined && !dateTime(i.scheduled_date)) throw new CultureScheduleError('scheduled_date must be a valid date/time', 400);
  if (i.assigned_to != null && !positive(i.assigned_to)) throw new CultureScheduleError('assigned_to must be a positive integer', 400);
  if (i.status !== undefined) status(i.status);
  if (i.notes != null && typeof i.notes !== 'string') throw new CultureScheduleError('notes must be a string', 400);
}
export async function createSchedule(input: CreateScheduleInput): Promise<CultureSchedule> {
  validateCreate(input);
  if (!await CellCulture.exists({ id: input.cell_culture_id })) throw new CultureScheduleError('Referenced cell culture does not exist', 400);
  if (input.assigned_to != null && !await User.exists({ id: input.assigned_to })) throw new CultureScheduleError('Referenced assigned_to user does not exist', 400);
  const doc = await ScheduleModel.create({ id: await nextId('culture_schedules'), cell_culture_id: input.cell_culture_id, task_type: input.task_type, scheduled_date: new Date(input.scheduled_date!).toISOString(), assigned_to: input.assigned_to ?? null, status: 'pending', notes: input.notes ?? null, created_at: new Date().toISOString() });
  return plain<CultureSchedule>(doc);
}
export interface ListScheduleFilter { cellCultureId?: number; status?: string; taskType?: string; assignedTo?: number; scheduledFrom?: string; scheduledTo?: string; }
export async function listSchedules(filter: ListScheduleFilter = {}): Promise<CultureSchedule[]> {
  const q: Record<string, any> = {};
  if (filter.cellCultureId !== undefined) { if (!positive(filter.cellCultureId)) throw new CultureScheduleError('cell_culture_id filter must be a positive integer', 400); q.cell_culture_id = filter.cellCultureId; }
  if (filter.status !== undefined) { status(filter.status); q.status = filter.status; }
  if (filter.taskType !== undefined) { task(filter.taskType); q.task_type = filter.taskType; }
  if (filter.assignedTo !== undefined) { if (!positive(filter.assignedTo)) throw new CultureScheduleError('assigned_to filter must be a positive integer', 400); q.assigned_to = filter.assignedTo; }
  if (filter.scheduledFrom !== undefined) { if (!dateTime(filter.scheduledFrom)) throw new CultureScheduleError('scheduled_from must be a valid date/time', 400); q.scheduled_date = { ...q.scheduled_date, $gte: new Date(filter.scheduledFrom).toISOString() }; }
  if (filter.scheduledTo !== undefined) { if (!dateTime(filter.scheduledTo)) throw new CultureScheduleError('scheduled_to must be a valid date/time', 400); q.scheduled_date = { ...q.scheduled_date, $lte: new Date(filter.scheduledTo).toISOString() }; }
  return (await ScheduleModel.find(q).sort({ scheduled_date: 1 }).lean()).map((x) => plain<CultureSchedule>(x));
}
export async function getScheduleById(id: number): Promise<CultureSchedule | null> { const x = await ScheduleModel.findOne({ id }).lean(); return x ? plain<CultureSchedule>(x) : null; }
export async function updateSchedule(id: number, input: UpdateScheduleInput): Promise<CultureSchedule> {
  validateUpdate(input);
  if (input.assigned_to != null && !await User.exists({ id: input.assigned_to })) throw new CultureScheduleError('Referenced assigned_to user does not exist', 400);
  const update: Record<string, unknown> = {};
  for (const f of ['task_type', 'scheduled_date', 'assigned_to', 'status', 'notes'] as const) if (input[f] !== undefined) update[f] = f === 'scheduled_date' ? new Date(input[f] as string).toISOString() : input[f];
  if (!Object.keys(update).length) throw new CultureScheduleError('No valid fields provided to update', 400);
  const doc = await ScheduleModel.findOneAndUpdate({ id }, { $set: update }, { new: true }).lean();
  if (!doc) throw new CultureScheduleError('Culture schedule not found', 404);
  return plain<CultureSchedule>(doc);
}
export async function deleteSchedule(id: number): Promise<void> { if (!await ScheduleModel.exists({ id })) throw new CultureScheduleError('Culture schedule not found', 404); await ScheduleModel.deleteOne({ id }); }
