import { CellCulture as CultureModel, ContaminationLog, CultureSchedule, Experiment, Incubator as IncubatorModel, plain } from '../../db/models';
import { nextId } from '../../db/db';

export type CultureStatus = 'active' | 'contaminated' | 'discontinued';
export const VALID_STATUSES: CultureStatus[] = ['active', 'contaminated', 'discontinued'];
export interface CellCulture { id: number; culture_name: string; cell_line: string; incubator_id: number | null; current_passage_number: number; status: CultureStatus; started_by: number | null; started_at: string; }
export class CellCultureError extends Error { statusCode: number; constructor(message: string, statusCode: number) { super(message); this.name = 'CellCultureError'; this.statusCode = statusCode; } }
export interface CreateCellCultureInput { culture_name?: string; cell_line?: string; incubator_id?: number | null; status?: string; }
export interface UpdateCellCultureInput extends CreateCellCultureInput {}
function positiveInt(v: unknown): v is number { return typeof v === 'number' && Number.isInteger(v) && v > 0; }
function validate(i: CreateCellCultureInput, required: boolean): void {
  if (required && !i.culture_name?.trim()) throw new CellCultureError('culture_name is required', 400);
  if (i.culture_name !== undefined && !i.culture_name.trim()) throw new CellCultureError('culture_name cannot be empty', 400);
  if (required && !i.cell_line?.trim()) throw new CellCultureError('cell_line is required', 400);
  if (i.cell_line !== undefined && !i.cell_line.trim()) throw new CellCultureError('cell_line cannot be empty', 400);
  if (i.incubator_id != null && !positiveInt(i.incubator_id)) throw new CellCultureError('incubator_id must be a positive integer', 400);
  if (i.status !== undefined && !VALID_STATUSES.includes(i.status as CultureStatus)) throw new CellCultureError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
}
export async function createCellCulture(input: CreateCellCultureInput, startedBy: number): Promise<CellCulture> {
  validate(input, true);
  if (input.incubator_id != null && !await IncubatorModel.exists({ id: input.incubator_id })) throw new CellCultureError('Referenced incubator does not exist', 400);
  const doc = await CultureModel.create({ id: await nextId('cell_cultures'), culture_name: input.culture_name!.trim(), cell_line: input.cell_line!.trim(), incubator_id: input.incubator_id ?? null, current_passage_number: 0, status: input.status ?? 'active', started_by: startedBy, started_at: new Date().toISOString(), passages: [] });
  return plain<CellCulture>(doc);
}
export async function listCellCultures(filter: { status?: string; incubatorId?: number } = {}): Promise<CellCulture[]> {
  const query: Record<string, unknown> = {};
  if (filter.status !== undefined) { if (!VALID_STATUSES.includes(filter.status as CultureStatus)) throw new CellCultureError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400); query.status = filter.status; }
  if (filter.incubatorId !== undefined) { if (!positiveInt(filter.incubatorId)) throw new CellCultureError('incubator_id filter must be a positive integer', 400); query.incubator_id = filter.incubatorId; }
  return (await CultureModel.find(query).sort({ started_at: -1 }).lean()).map((x) => plain<CellCulture>(x));
}
export async function getCellCultureById(id: number): Promise<CellCulture | null> { const doc = await CultureModel.findOne({ id }).lean(); return doc ? plain<CellCulture>(doc) : null; }
export async function updateCellCulture(id: number, input: UpdateCellCultureInput): Promise<CellCulture> {
  validate(input, false);
  if (input.incubator_id != null && !await IncubatorModel.exists({ id: input.incubator_id })) throw new CellCultureError('Referenced incubator does not exist', 400);
  const updates: Record<string, unknown> = {};
  if (input.culture_name !== undefined) updates.culture_name = input.culture_name.trim();
  if (input.cell_line !== undefined) updates.cell_line = input.cell_line.trim();
  if (input.incubator_id !== undefined) updates.incubator_id = input.incubator_id;
  if (input.status !== undefined) updates.status = input.status;
  if (!Object.keys(updates).length) throw new CellCultureError('No valid fields provided to update', 400);
  const doc = await CultureModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  if (!doc) throw new CellCultureError('Cell culture not found', 404);
  return plain<CellCulture>(doc);
}
export async function deleteCellCulture(id: number): Promise<void> {
  if (!await CultureModel.exists({ id })) throw new CellCultureError('Cell culture not found', 404);
  if (await Experiment.exists({ cell_culture_id: id })) throw new CellCultureError('Cannot delete: this culture has linked experiments', 409);
  await Promise.all([CultureModel.deleteOne({ id }), CultureSchedule.deleteMany({ cell_culture_id: id }), ContaminationLog.deleteMany({ cell_culture_id: id })]);
}
