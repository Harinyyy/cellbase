import { Request, Response } from 'express';
import {
  createMediaBatch,
  listMediaBatches,
  getMediaBatchById,
  updateMediaBatch,
  MediaBatchError,
} from './media.service';

function handleMediaBatchError(err: unknown, res: Response): void {
  if (err instanceof MediaBatchError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected media batch error:', err);
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
      // Should not happen — this route is behind `authenticate` — but
      // guards the type and fails safely if routing ever changes.
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // prepared_by always comes from the authenticated user, never the
    // request body — see media.service.ts createMediaBatch signature.
    const mediaBatch = await createMediaBatch(req.body ?? {}, req.user.id);
    res.status(201).json({ mediaBatch });
  } catch (err) {
    handleMediaBatchError(err, res);
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const expiringSoon = req.query.expiring_soon === 'true';
    const mediaBatches = await listMediaBatches({ expiringSoon });
    res.status(200).json({ mediaBatches });
  } catch (err) {
    handleMediaBatchError(err, res);
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid media batch id' });
    return;
  }
  try {
    const mediaBatch = await getMediaBatchById(id);
    if (!mediaBatch) {
      res.status(404).json({ error: 'Media batch not found' });
      return;
    }
    res.status(200).json({ mediaBatch });
  } catch (err) {
    handleMediaBatchError(err, res);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid media batch id' });
    return;
  }
  try {
    // prepared_by is intentionally never read from req.body here — it is
    // not part of UpdateMediaBatchInput, so a client cannot modify it.
    const mediaBatch = await updateMediaBatch(id, req.body ?? {});
    res.status(200).json({ mediaBatch });
  } catch (err) {
    handleMediaBatchError(err, res);
  }
}
