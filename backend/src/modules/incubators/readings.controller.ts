import { Request, Response } from 'express';
import { createReading, listReadings } from './readings.service';
import { IncubatorError } from './incubators.service';

function handleReadingError(err: unknown, res: Response): void {
  if (err instanceof IncubatorError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected incubator reading error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function create(req: Request, res: Response): Promise<void> {
  const incubatorId = parseId(req.params.id);
  if (incubatorId === null) {
    res.status(400).json({ error: 'Invalid incubator id' });
    return;
  }
  try {
    // req.user is guaranteed by the `authenticate` middleware mounted on
    // this router; recorded_by is nullable in the schema for defense in depth.
    const recordedBy = req.user ? req.user.id : null;
    const reading = await createReading(incubatorId, req.body ?? {}, recordedBy);
    res.status(201).json({ reading });
  } catch (err) {
    handleReadingError(err, res);
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  const incubatorId = parseId(req.params.id);
  if (incubatorId === null) {
    res.status(400).json({ error: 'Invalid incubator id' });
    return;
  }
  try {
    const rawLimit = req.query.limit;
    let limit: number | undefined;
    if (typeof rawLimit === 'string' && rawLimit.trim() !== '') {
      const parsed = Number(rawLimit);
      limit = Number.isFinite(parsed) ? parsed : NaN; // let the service reject non-integers cleanly
    }
    const readings = await listReadings(incubatorId, limit);
    res.status(200).json({ readings });
  } catch (err) {
    handleReadingError(err, res);
  }
}
