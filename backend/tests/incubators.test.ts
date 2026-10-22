import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createIncubator,
  updateIncubator,
  listIncubators,
  VALID_STATUSES,
  IncubatorError,
} from '../src/modules/incubators/incubators.service';

// These tests exercise validation logic that runs BEFORE any database call
// (see incubators.service.ts / readings.service.ts — validation always
// happens first, DB access second), so they do not require MongoDB to
// be running. End-to-end checks (actual insert/update/delete, 404s from
// a real missing row, cascade-delete behavior) are listed as manual
// verification steps in the implementation report.

describe('createIncubator validation', () => {
  test('rejects a missing name before touching the database', async () => {
    await assert.rejects(
      () => createIncubator({}),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });

  test('rejects a blank name', async () => {
    await assert.rejects(
      () => createIncubator({ name: '   ' }),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });

  test('rejects a non-numeric target_temperature_c', async () => {
    await assert.rejects(
      () => createIncubator({ name: 'Incubator A', target_temperature_c: 'hot' as unknown as number }),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });

  test('rejects an invalid status value', async () => {
    await assert.rejects(
      () => createIncubator({ name: 'Incubator A', status: 'broken' }),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });

  test('VALID_STATUSES matches the application validation rules', () => {
    assert.deepEqual(VALID_STATUSES, ['operational', 'maintenance', 'out_of_order']);
  });
});

describe('listIncubators status filter validation', () => {
  test('rejects an invalid status filter before querying the database', async () => {
    await assert.rejects(
      () => listIncubators({ status: 'not-a-real-status' }),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });
});

describe('updateIncubator field validation', () => {
  test('rejects an invalid status before checking whether the row exists', async () => {
    // Uses an id that cannot exist (0) — if this rejects with the *validation*
    // message rather than "Incubator not found", we've confirmed validation
    // runs first and no DB round-trip for existence was required to fail fast.
    await assert.rejects(
      () => updateIncubator(0, { status: 'not-a-real-status' }),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400 && err.message.includes('status must be one of'),
    );
  });

  test('rejects a non-numeric target_co2_percent before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateIncubator(0, { target_co2_percent: 'lots' as unknown as number }),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });
});

