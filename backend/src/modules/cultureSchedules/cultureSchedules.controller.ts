import { Request, Response } from 'express';
import {
  createSchedule,
  listSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  CultureScheduleError,
} from './cultureSchedules.service';

function handleScheduleError(err: unknown, res: Response): void {
  if (err instanceof CultureScheduleError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected culture schedule error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

/** Parses a route param into a positive integer id, or null if invalid. */
function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Parses an optional numeric query param, leaving it undefined if absent/blank. */
function parseOptionalIntQuery(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return undefined;
  }
  return Number(raw);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const schedule = await createSchedule(req.body ?? {});
    res.status(201).json({ schedule });
  } catch (err) {
    handleScheduleError(err, res);
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const filter = {
      cellCultureId: parseOptionalIntQuery(req.query.cell_culture_id),
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      taskType: typeof req.query.task_type === 'string' ? req.query.task_type : undefined,
      assignedTo: parseOptionalIntQuery(req.query.assigned_to),
      scheduledFrom: typeof req.query.scheduled_from === 'string' ? req.query.scheduled_from : undefined,
      scheduledTo: typeof req.query.scheduled_to === 'string' ? req.query.scheduled_to : undefined,
    };
    const schedules = await listSchedules(filter);
    res.status(200).json({ schedules });
  } catch (err) {
    handleScheduleError(err, res);
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid culture schedule id' });
    return;
  }
  try {
    const schedule = await getScheduleById(id);
    if (!schedule) {
      res.status(404).json({ error: 'Culture schedule not found' });
      return;
    }
    res.status(200).json({ schedule });
  } catch (err) {
    handleScheduleError(err, res);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid culture schedule id' });
    return;
  }
  try {
    const schedule = await updateSchedule(id, req.body ?? {});
    res.status(200).json({ schedule });
  } catch (err) {
    handleScheduleError(err, res);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid culture schedule id' });
    return;
  }
  try {
    await deleteSchedule(id);
    res.status(204).send();
  } catch (err) {
    handleScheduleError(err, res);
  }
}
