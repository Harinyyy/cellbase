import { Request, Response } from 'express';
import {
  createCellCulture,
  listCellCultures,
  getCellCultureById,
  updateCellCulture,
  deleteCellCulture,
  CellCultureError,
} from './cellCultures.service';

function handleCellCultureError(err: unknown, res: Response): void {
  if (err instanceof CellCultureError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected cell culture error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

/** Parses a route param into a positive integer id, or null if invalid. */
function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // started_by always comes from the authenticated user, never the
    // request body — see cellCultures.service.ts createCellCulture signature.
    const cellCulture = await createCellCulture(req.body ?? {}, req.user.id);
    res.status(201).json({ cellCulture });
  } catch (err) {
    handleCellCultureError(err, res);
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

    let incubatorId: number | undefined;
    if (typeof req.query.incubator_id === 'string' && req.query.incubator_id.trim() !== '') {
      incubatorId = Number(req.query.incubator_id);
    }

    const cellCultures = await listCellCultures({ status: statusFilter, incubatorId });
    res.status(200).json({ cellCultures });
  } catch (err) {
    handleCellCultureError(err, res);
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid cell culture id' });
    return;
  }
  try {
    const cellCulture = await getCellCultureById(id);
    if (!cellCulture) {
      res.status(404).json({ error: 'Cell culture not found' });
      return;
    }
    res.status(200).json({ cellCulture });
  } catch (err) {
    handleCellCultureError(err, res);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid cell culture id' });
    return;
  }
  try {
    const cellCulture = await updateCellCulture(id, req.body ?? {});
    res.status(200).json({ cellCulture });
  } catch (err) {
    handleCellCultureError(err, res);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid cell culture id' });
    return;
  }
  try {
    await deleteCellCulture(id);
    res.status(204).send();
  } catch (err) {
    handleCellCultureError(err, res);
  }
}
