import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSchedule,
  updateSchedule,
  listSchedules,
  VALID_TASK_TYPES,
  VALID_STATUSES,
  CultureScheduleError,
} from '../src/modules/cultureSchedules/cultureSchedules.service';

// As with cell-cultures.test.ts / media.test.ts: field-shape validation
// runs before any database call, so these reject on bad input without
// needing MongoDB. Checks that require a DB round-trip (cell culture
// existence, assigned_to user existence, actual row lookups) are listed
// as manual verification steps in the implementation report, using an id
// (0) that can never exist to confirm a rejection came from validation.

describe('createSchedule validation', () => {
  test('rejects a missing cell_culture_id before touching the database', async () => {
    await assert.rejects(
      () => createSchedule({ task_type: 'feed', scheduled_date: '2026-09-10T09:00:00Z' }),
      (err: unknown) =>
        err instanceof CultureScheduleError && err.statusCode === 400 && err.message.includes('cell_culture_id'),
    );
  });

  test('rejects a non-positive-integer cell_culture_id', async () => {
    await assert.rejects(
      () =>
        createSchedule({
          cell_culture_id: -1,
          task_type: 'feed',
          scheduled_date: '2026-09-10T09:00:00Z',
        }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('rejects a missing task_type', async () => {
    await assert.rejects(
      () => createSchedule({ cell_culture_id: 1, scheduled_date: '2026-09-10T09:00:00Z' }),
      (err: unknown) =>
        err instanceof CultureScheduleError && err.statusCode === 400 && err.message.includes('task_type'),
    );
  });

  test('rejects an invalid task_type', async () => {
    await assert.rejects(
      () =>
        createSchedule({
          cell_culture_id: 1,
          task_type: 'clean_incubator',
          scheduled_date: '2026-09-10T09:00:00Z',
        }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('rejects a missing scheduled_date', async () => {
    await assert.rejects(
      () => createSchedule({ cell_culture_id: 1, task_type: 'feed' }),
      (err: unknown) =>
        err instanceof CultureScheduleError && err.statusCode === 400 && err.message.includes('scheduled_date'),
    );
  });

  test('rejects a malformed scheduled_date', async () => {
    await assert.rejects(
      () =>
        createSchedule({
          cell_culture_id: 1,
          task_type: 'feed',
          scheduled_date: 'not-a-date',
        }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('rejects a non-positive-integer assigned_to', async () => {
    await assert.rejects(
      () =>
        createSchedule({
          cell_culture_id: 1,
          task_type: 'feed',
          scheduled_date: '2026-09-10T09:00:00Z',
          assigned_to: 1.5,
        }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('VALID_TASK_TYPES matches the application validation rules', () => {
    assert.deepEqual(VALID_TASK_TYPES, ['feed', 'passage', 'media_change', 'check', 'other']);
  });

  test('VALID_STATUSES matches the application validation rules', () => {
    assert.deepEqual(VALID_STATUSES, ['pending', 'completed', 'missed']);
  });
});

describe('listSchedules filter validation', () => {
  test('rejects an invalid status filter before querying the database', async () => {
    await assert.rejects(
      () => listSchedules({ status: 'overdue' }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('rejects an invalid task_type filter before querying the database', async () => {
    await assert.rejects(
      () => listSchedules({ taskType: 'sterilize' }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('rejects a malformed scheduled_from filter', async () => {
    await assert.rejects(
      () => listSchedules({ scheduledFrom: 'not-a-date' }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('rejects a non-positive-integer assigned_to filter', async () => {
    await assert.rejects(
      () => listSchedules({ assignedTo: -3 }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });
});

describe('updateSchedule field validation', () => {
  test('rejects an invalid status before checking whether the row exists', async () => {
    // Uses an id that cannot exist (0) — rejecting with the validation
    // message (not "not found") confirms validation ran first.
    await assert.rejects(
      () => updateSchedule(0, { status: 'overdue' }),
      (err: unknown) =>
        err instanceof CultureScheduleError && err.statusCode === 400 && err.message.includes('status must be one of'),
    );
  });

  test('rejects an invalid task_type before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateSchedule(0, { task_type: 'sterilize' }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });

  test('rejects a malformed scheduled_date before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateSchedule(0, { scheduled_date: '10-09-2026' }),
      (err: unknown) => err instanceof CultureScheduleError && err.statusCode === 400,
    );
  });
});

