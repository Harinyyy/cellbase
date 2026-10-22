import { Request, Response } from 'express';
import {
  createObservation,
  listObservations,
  getObservationById,
  updateObservation,
  deleteObservation,
  ObservationError,
} from './observations.service';

function handleObservationError(err: unknown, res: Response): void {
  if (err instanceof ObservationError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected experiment observation error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

/** Parses a route param into a positive integer id, or null if invalid. */
function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// --- Nested under /api/experiments/:id/observations ---

export async function createForExperiment(req: Request, res: Response): Promise<void> {
  const experimentId = parseId(req.params.id);
  if (experimentId === null) {
    res.status(400).json({ error: 'Invalid experiment id' });
    return;
  }
  try {
    // recorded_by always comes from the authenticated user, never the
    // request body.
    const recordedBy = req.user ? req.user.id : null;
    const observation = await createObservation(experimentId, req.body ?? {}, recordedBy);
    res.status(201).json({ observation });
  } catch (err) {
    handleObservationError(err, res);
  }
}

export async function listForExperiment(req: Request, res: Response): Promise<void> {
  const experimentId = parseId(req.params.id);
  if (experimentId === null) {
    res.status(400).json({ error: 'Invalid experiment id' });
    return;
  }
  try {
    const observations = await listObservations(experimentId);
    res.status(200).json({ observations });
  } catch (err) {
    handleObservationError(err, res);
  }
}

// --- Standalone, under /api/observations/:id ---

export async function getOne(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid observation id' });
    return;
  }
  try {
    const observation = await getObservationById(id);
    if (!observation) {
      res.status(404).json({ error: 'Observation not found' });
      return;
    }
    res.status(200).json({ observation });
  } catch (err) {
    handleObservationError(err, res);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid observation id' });
    return;
  }
  try {
    // experiment_id and recorded_by are intentionally never read from
    // req.body here — neither is part of UpdateObservationInput.
    const observation = await updateObservation(id, req.body ?? {});
    res.status(200).json({ observation });
  } catch (err) {
    handleObservationError(err, res);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid observation id' });
    return;
  }
  try {
    await deleteObservation(id);
    res.status(204).send();
  } catch (err) {
    handleObservationError(err, res);
  }
}
