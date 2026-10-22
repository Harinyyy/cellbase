import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createContaminationLog,
  updateContaminationLog,
  listContaminationLogs,
  VALID_STATUSES,
  ContaminationLogError,
} from '../src/modules/contaminationLogs/contaminationLogs.service';

// As with culture-schedules.test.ts: field-shape validation runs before
// any database call, so these reject on bad input without needing
// MongoDB. Checks that require a DB round-trip (cell culture existence,
// the transactional culture-status side effect, actual row lookups) are
// listed as manual verification steps in the implementation report, using
// an id (0) that can never exist to confirm a rejection came from
// validation and not a DB error.

describe('createContaminationLog validation', () => {
  test('rejects a missing cell_culture_id before touching the database', async () => {
    await assert.rejects(
      () => createContaminationLog({ description: 'Cloudy media, suspected bacterial contamination' }, 1),
      (err: unknown) =>
        err instanceof ContaminationLogError && err.statusCode === 400 && err.message.includes('cell_culture_id'),
    );
  });

  test('rejects a non-positive-integer cell_culture_id', async () => {
    await assert.rejects(
      () => createContaminationLog({ cell_culture_id: -1, description: 'Contamination observed' }, 1),
      (err: unknown) => err instanceof ContaminationLogError && err.statusCode === 400,
    );
  });

  test('rejects a non-integer cell_culture_id', async () => {
    await assert.rejects(
      () => createContaminationLog({ cell_culture_id: 1.5, description: 'Contamination observed' }, 1),
      (err: unknown) => err instanceof ContaminationLogError && err.statusCode === 400,
    );
  });

  test('rejects a missing description', async () => {
    await assert.rejects(
      () => createContaminationLog({ cell_culture_id: 1 }, 1),
      (err: unknown) =>
        err instanceof ContaminationLogError && err.statusCode === 400 && err.message.includes('description'),
    );
  });

  test('rejects a blank description', async () => {
    await assert.rejects(
      () => createContaminationLog({ cell_culture_id: 1, description: '   ' }, 1),
      (err: unknown) => err instanceof ContaminationLogError && err.statusCode === 400,
    );
  });

  test('VALID_STATUSES matches the application validation rules', () => {
    assert.deepEqual(VALID_STATUSES, ['open', 'resolved']);
  });
});

describe('listContaminationLogs filter validation', () => {
  test('rejects an invalid status filter before querying the database', async () => {
    await assert.rejects(
      () => listContaminationLogs({ status: 'under_investigation' }),
      (err: unknown) => err instanceof ContaminationLogError && err.statusCode === 400,
    );
  });

  test('rejects a non-positive-integer cell_culture_id filter', async () => {
    await assert.rejects(
      () => listContaminationLogs({ cellCultureId: -2 }),
      (err: unknown) => err instanceof ContaminationLogError && err.statusCode === 400,
    );
  });
});

describe('updateContaminationLog field validation', () => {
  test('rejects an invalid status before checking whether the row exists', async () => {
    // Uses an id that cannot exist (0) — rejecting with the validation
    // message (not "not found") confirms validation ran first.
    await assert.rejects(
      () => updateContaminationLog(0, { status: 'under_investigation' }),
      (err: unknown) =>
        err instanceof ContaminationLogError && err.statusCode === 400 && err.message.includes('status must be one of'),
    );
  });

  test('rejects an empty description before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateContaminationLog(0, { description: '   ' }),
      (err: unknown) => err instanceof ContaminationLogError && err.statusCode === 400,
    );
  });

  test('rejects a non-string resolution_notes before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateContaminationLog(0, { resolution_notes: 12345 as unknown as string }),
      (err: unknown) => err instanceof ContaminationLogError && err.statusCode === 400,
    );
  });

  test('accepts a null resolution_notes at the validation stage', async () => {
    // Passes validation (null is allowed), then fails on the DB existence
    // check for a nonexistent id — proving null did NOT trigger a 400.
    await assert.rejects(
      () => updateContaminationLog(0, { resolution_notes: null }),
      (err: unknown) => !(err instanceof ContaminationLogError && err.statusCode === 400),
    );
  });
});

