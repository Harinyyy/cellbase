import { Request, Response } from 'express';
import {
  createIncubator,
  listIncubators,
  getIncubatorById,
  updateIncubator,
  deleteIncubator,
  IncubatorError,
} from './incubators.service';

function handleIncubatorError(err: unknown, res: Response): void {
  if (err instanceof IncubatorError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected incubator error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

/** Parses a route param into a positive integer id, or null if invalid. */
function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const incubator = await createIncubator(req.body ?? {});
    res.status(201).json({ incubator });
  } catch (err) {
    handleIncubatorError(err, res);
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    const incubators = await listIncubators({ status: statusFilter });
    res.status(200).json({ incubators });
  } catch (err) {
    handleIncubatorError(err, res);
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid incubator id' });
    return;
  }
  try {
    const incubator = await getIncubatorById(id);
    if (!incubator) {
      res.status(404).json({ error: 'Incubator not found' });
      return;
    }
    res.status(200).json({ incubator });
  } catch (err) {
    handleIncubatorError(err, res);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid incubator id' });
    return;
  }
  try {
    const incubator = await updateIncubator(id, req.body ?? {});
    res.status(200).json({ incubator });
  } catch (err) {
    handleIncubatorError(err, res);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid incubator id' });
    return;
  }
  try {
    await deleteIncubator(id);
    res.status(204).send();
  } catch (err) {
    handleIncubatorError(err, res);
  }
}
