import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createExperiment,
  updateExperiment,
  listExperiments,
  VALID_STATUSES,
  ExperimentError,
} from '../src/modules/experiments/experiments.service';

// As with contamination-logs.test.ts: field-shape validation runs before
// any database call, so these reject on bad input without needing
// MongoDB. Checks that require a DB round-trip (cell culture existence,
// actual row lookups, the observation_count aggregate) are listed as
// manual verification steps in the implementation report, using an id (0)
// that can never exist to confirm a rejection came from validation and
// not a DB error.

describe('createExperiment validation', () => {
  test('rejects a missing title before touching the database', async () => {
    await assert.rejects(
      () => createExperiment({ cell_culture_id: 1, start_date: '2026-09-10' }, 1),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400 && err.message.includes('title'),
    );
  });

  test('rejects a blank title', async () => {
    await assert.rejects(
      () => createExperiment({ title: '   ', cell_culture_id: 1, start_date: '2026-09-10' }, 1),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });

  test('rejects a missing cell_culture_id', async () => {
    await assert.rejects(
      () => createExperiment({ title: 'Passage stress test', start_date: '2026-09-10' }, 1),
      (err: unknown) =>
        err instanceof ExperimentError && err.statusCode === 400 && err.message.includes('cell_culture_id'),
    );
  });

  test('rejects a non-positive-integer cell_culture_id', async () => {
    await assert.rejects(
      () =>
        createExperiment({ title: 'Passage stress test', cell_culture_id: -1, start_date: '2026-09-10' }, 1),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });

  test('rejects a missing start_date', async () => {
    await assert.rejects(
      () => createExperiment({ title: 'Passage stress test', cell_culture_id: 1 }, 1),
      (err: unknown) =>
        err instanceof ExperimentError && err.statusCode === 400 && err.message.includes('start_date'),
    );
  });

  test('rejects a malformed start_date', async () => {
    await assert.rejects(
      () =>
        createExperiment(
          { title: 'Passage stress test', cell_culture_id: 1, start_date: '10/09/2026' },
          1,
        ),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });

  test('rejects a non-string objective', async () => {
    await assert.rejects(
      () =>
        createExperiment(
          {
            title: 'Passage stress test',
            cell_culture_id: 1,
            start_date: '2026-09-10',
            objective: 12345 as unknown as string,
          },
          1,
        ),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });

  test('VALID_STATUSES matches the application validation rules', () => {
    assert.deepEqual(VALID_STATUSES, ['ongoing', 'completed', 'aborted']);
  });
});

describe('listExperiments filter validation', () => {
  test('rejects an invalid status filter before querying the database', async () => {
    await assert.rejects(
      () => listExperiments({ status: 'paused' }),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });

  test('rejects a non-positive-integer cell_culture_id filter', async () => {
    await assert.rejects(
      () => listExperiments({ cellCultureId: -2 }),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });
});

describe('updateExperiment field validation', () => {
  test('rejects an invalid status before checking whether the row exists', async () => {
    // Uses an id that cannot exist (0) — rejecting with the validation
    // message (not "not found") confirms validation ran first.
    await assert.rejects(
      () => updateExperiment(0, { status: 'paused' }),
      (err: unknown) =>
        err instanceof ExperimentError && err.statusCode === 400 && err.message.includes('status must be one of'),
    );
  });

  test('rejects an empty title before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateExperiment(0, { title: '  ' }),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });

  test('rejects a malformed end_date before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateExperiment(0, { end_date: '2026/09/10' }),
      (err: unknown) => err instanceof ExperimentError && err.statusCode === 400,
    );
  });

  test('accepts a null end_date at the validation stage', async () => {
    // Passes validation (null is allowed), then fails on the DB existence
    // check for a nonexistent id — proving null did NOT trigger a 400.
    await assert.rejects(
      () => updateExperiment(0, { end_date: null }),
      (err: unknown) => !(err instanceof ExperimentError && err.statusCode === 400),
    );
  });
});

