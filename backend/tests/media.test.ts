import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMediaBatch,
  updateMediaBatch,
  MediaBatchError,
  validateCreate,
} from '../src/modules/media/media.service';

// As with incubators.test.ts: validation always runs before any database
// call in media.service.ts, so these reject on bad input without needing
// MongoDB. For updateMediaBatch, an id of 0 (which can never exist) is
// used to confirm the rejection came from validation, not a DB lookup.

describe('createMediaBatch validation', () => {
  test('rejects a missing media_name before touching the database', async () => {
    await assert.rejects(
      () => createMediaBatch({ prepared_date: '2026-01-01', volume_prepared_ml: 500 }, 1),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400 && err.message.includes('media_name'),
    );
  });

  test('rejects a blank media_name', async () => {
    await assert.rejects(
      () => createMediaBatch({ media_name: '   ', prepared_date: '2026-01-01', volume_prepared_ml: 500 }, 1),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400,
    );
  });

  test('rejects a missing prepared_date', async () => {
    await assert.rejects(
      () => createMediaBatch({ media_name: 'DMEM + 10% FBS', volume_prepared_ml: 500 }, 1),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400 && err.message.includes('prepared_date'),
    );
  });

  test('rejects a malformed prepared_date', async () => {
    await assert.rejects(
      () =>
        createMediaBatch(
          { media_name: 'DMEM + 10% FBS', prepared_date: '01/01/2026', volume_prepared_ml: 500 },
          1,
        ),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400,
    );
  });

  test('rejects a missing volume_prepared_ml', async () => {
    await assert.rejects(
      () => createMediaBatch({ media_name: 'DMEM + 10% FBS', prepared_date: '2026-01-01' }, 1),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400 && err.message.includes('volume_prepared_ml'),
    );
  });

  test('rejects a zero or negative volume_prepared_ml (matches CHECK volume_prepared_ml > 0)', async () => {
    await assert.rejects(
      () =>
        createMediaBatch(
          { media_name: 'DMEM + 10% FBS', prepared_date: '2026-01-01', volume_prepared_ml: 0 },
          1,
        ),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400,
    );
  });

  test('rejects a non-numeric volume_prepared_ml', async () => {
    await assert.rejects(
      () =>
        createMediaBatch(
          { media_name: 'DMEM + 10% FBS', prepared_date: '2026-01-01', volume_prepared_ml: 'lots' as unknown as number },
          1,
        ),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400,
    );
  });

  test('rejects a malformed expiry_date', async () => {
    await assert.rejects(
      () =>
        createMediaBatch(
          {
            media_name: 'DMEM + 10% FBS',
            prepared_date: '2026-01-01',
            volume_prepared_ml: 500,
            expiry_date: 'not-a-date',
          },
          1,
        ),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400,
    );
  });

  test('accepts a null expiry_date (optional field)', () => {
    assert.doesNotThrow(() => validateCreate({ media_name: 'DMEM + 10% FBS', prepared_date: '2026-01-01', volume_prepared_ml: 500, expiry_date: null }));
  });
});

describe('updateMediaBatch validation', () => {
  test('rejects an empty media_name before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateMediaBatch(0, { media_name: '  ' }),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400,
    );
  });

  test('rejects a negative volume_remaining_ml before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateMediaBatch(0, { volume_remaining_ml: -5 }),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400 && err.message.includes('volume_remaining_ml'),
    );
  });

  test('accepts volume_remaining_ml of exactly 0 (matches CHECK volume_remaining_ml >= 0)', async () => {
    // Passes validation (0 is allowed), then fails on the DB existence
    // check for a nonexistent id — proving 0 did NOT trigger a 400.
    await assert.rejects(
      () => updateMediaBatch(0, { volume_remaining_ml: 0 }),
      (err: unknown) => !(err instanceof MediaBatchError && err.statusCode === 400),
    );
  });

  test('rejects a malformed prepared_date', async () => {
    await assert.rejects(
      () => updateMediaBatch(0, { prepared_date: '2026/01/01' }),
      (err: unknown) => err instanceof MediaBatchError && err.statusCode === 400,
    );
  });

  // Note: an empty update body (`{}`) passes validation trivially (nothing
  // to check) and only fails later — first on the existence lookup for a
  // real id, or on the "No valid fields provided to update" check for a
  // real, existing row. That specific path requires a live database and
  // is listed as a manual verification step in the implementation report.
});

