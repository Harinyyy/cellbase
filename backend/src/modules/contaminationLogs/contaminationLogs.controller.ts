import { Request, Response } from 'express';
import {
  createContaminationLog,
  listContaminationLogs,
  getContaminationLogById,
  updateContaminationLog,
  deleteContaminationLog,
  ContaminationLogError,
} from './contaminationLogs.service';

function handleContaminationLogError(err: unknown, res: Response): void {
  if (err instanceof ContaminationLogError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected contamination log error:', err);
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
    if (!req.user) {
      // Should not happen — this route is behind `authenticate` — but
      // guards the type and fails safely if routing ever changes.
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // reported_by always comes from the authenticated user, never the
    // request body — see contaminationLogs.service.ts.
    const contaminationLog = await createContaminationLog(req.body ?? {}, req.user.id);
    res.status(201).json({ contaminationLog });
  } catch (err) {
    handleContaminationLogError(err, res);
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const filter = {
      cellCultureId: parseOptionalIntQuery(req.query.cell_culture_id),
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    };
    const contaminationLogs = await listContaminationLogs(filter);
    res.status(200).json({ contaminationLogs });
  } catch (err) {
    handleContaminationLogError(err, res);
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid contamination log id' });
    return;
  }
  try {
    const contaminationLog = await getContaminationLogById(id);
    if (!contaminationLog) {
      res.status(404).json({ error: 'Contamination log not found' });
      return;
    }
    res.status(200).json({ contaminationLog });
  } catch (err) {
    handleContaminationLogError(err, res);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid contamination log id' });
    return;
  }
  try {
    // cell_culture_id and reported_by are intentionally never read from
    // req.body here — neither is part of UpdateContaminationLogInput.
    const contaminationLog = await updateContaminationLog(id, req.body ?? {});
    res.status(200).json({ contaminationLog });
  } catch (err) {
    handleContaminationLogError(err, res);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid contamination log id' });
    return;
  }
  try {
    await deleteContaminationLog(id);
    res.status(204).send();
  } catch (err) {
    handleContaminationLogError(err, res);
  }
}
