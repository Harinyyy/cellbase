import { CellCulture as CultureModel, plain } from '../../db/models';
import { nextId } from '../../db/db';
import { getCellCultureById, CellCultureError } from './cellCultures.service';

export interface PassageRecord { id: number; cell_culture_id: number; passage_number: number; passage_date: string; confluency_percent: string | null; notes: string | null; performed_by: number | null; }
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export interface CreatePassageInput { passage_number?: number; passage_date?: string; confluency_percent?: number | null; notes?: string | null; }
function validate(i: CreatePassageInput): void {
  if (!Number.isInteger(i.passage_number) || (i.passage_number as number) < 0) throw new CellCultureError('passage_number is required and must be an integer >= 0', 400);
  if (typeof i.passage_date !== 'string' || !DATE_REGEX.test(i.passage_date) || Number.isNaN(new Date(i.passage_date).getTime())) throw new CellCultureError('passage_date is required and must be a valid date (YYYY-MM-DD)', 400);
  if (i.confluency_percent != null && (typeof i.confluency_percent !== 'number' || !Number.isFinite(i.confluency_percent) || i.confluency_percent < 0 || i.confluency_percent > 100)) throw new CellCultureError('confluency_percent must be a number between 0 and 100', 400);
  if (i.notes != null && typeof i.notes !== 'string') throw new CellCultureError('notes must be a string', 400);
}
function shape(p: any, cultureId: number): PassageRecord { return { ...p, cell_culture_id: cultureId, confluency_percent: p.confluency_percent == null ? null : String(p.confluency_percent) }; }
export async function createPassage(cellCultureId: number, input: CreatePassageInput, performedBy: number | null): Promise<PassageRecord> {
  validate(input);
  if (!await getCellCultureById(cellCultureId)) throw new CellCultureError('Cell culture not found', 404);
  const passage = { id: await nextId('passage_records'), passage_number: input.passage_number, passage_date: input.passage_date, confluency_percent: input.confluency_percent ?? null, notes: input.notes ?? null, performed_by: performedBy };
  const updated = await CultureModel.findOneAndUpdate(
    { id: cellCultureId, 'passages.passage_number': { $ne: input.passage_number } },
    { $push: { passages: passage }, $max: { current_passage_number: input.passage_number } },
    { new: true },
  ).lean();
  if (!updated) throw new CellCultureError('This passage number has already been recorded for this culture', 409);
  return shape(passage, cellCultureId);
}
export async function listPassages(cellCultureId: number): Promise<PassageRecord[]> {
  const culture = await CultureModel.findOne({ id: cellCultureId }).lean();
  if (!culture) throw new CellCultureError('Cell culture not found', 404);
  return (culture.passages ?? []).slice().sort((a: any, b: any) => b.passage_number - a.passage_number).map((p: any) => shape(plain(p), cellCultureId));
}
