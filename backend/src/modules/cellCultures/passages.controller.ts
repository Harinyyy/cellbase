import { Request, Response } from 'express';
import { createPassage, listPassages } from './passages.service';
import { CellCultureError } from './cellCultures.service';

function handlePassageError(err: unknown, res: Response): void {
  if (err instanceof CellCultureError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected passage record error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function create(req: Request, res: Response): Promise<void> {
  const cellCultureId = parseId(req.params.id);
  if (cellCultureId === null) {
    res.status(400).json({ error: 'Invalid cell culture id' });
    return;
  }
  try {
    // performed_by always comes from the authenticated user, never the
    // request body.
    const performedBy = req.user ? req.user.id : null;
    const passage = await createPassage(cellCultureId, req.body ?? {}, performedBy);
    res.status(201).json({ passage });
  } catch (err) {
    handlePassageError(err, res);
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  const cellCultureId = parseId(req.params.id);
  if (cellCultureId === null) {
    res.status(400).json({ error: 'Invalid cell culture id' });
    return;
  }
  try {
    const passages = await listPassages(cellCultureId);
    res.status(200).json({ passages });
  } catch (err) {
    handlePassageError(err, res);
  }
}
