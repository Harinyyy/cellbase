import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCellCulture,
  updateCellCulture,
  listCellCultures,
  VALID_STATUSES,
  CellCultureError,
} from '../src/modules/cellCultures/cellCultures.service';

// As with incubators.test.ts / media.test.ts: field-shape validation runs
// before any database call, so these reject on bad input without needing
// MongoDB. Checks that require a DB round-trip (incubator existence,
// duplicate names, actual row lookups) are listed as manual verification
// steps in the implementation report, using an id (0) that can never exist
// to confirm a rejection came from validation and not a DB error.

describe('createCellCulture validation', () => {
  test('rejects a missing culture_name before touching the database', async () => {
    await assert.rejects(
      () => createCellCulture({ cell_line: 'HeLa' }, 1),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400 && err.message.includes('culture_name'),
    );
  });

  test('rejects a missing cell_line', async () => {
    await assert.rejects(
      () => createCellCulture({ culture_name: 'Flask A' }, 1),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400 && err.message.includes('cell_line'),
    );
  });

  test('rejects a blank culture_name', async () => {
    await assert.rejects(
      () => createCellCulture({ culture_name: '   ', cell_line: 'HeLa' }, 1),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects an invalid status value', async () => {
    await assert.rejects(
      () => createCellCulture({ culture_name: 'Flask A', cell_line: 'HeLa', status: 'thriving' }, 1),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects a non-integer incubator_id', async () => {
    await assert.rejects(
      () =>
        createCellCulture(
          { culture_name: 'Flask A', cell_line: 'HeLa', incubator_id: 1.5 },
          1,
        ),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects a negative incubator_id', async () => {
    await assert.rejects(
      () =>
        createCellCulture(
          { culture_name: 'Flask A', cell_line: 'HeLa', incubator_id: -1 },
          1,
        ),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('VALID_STATUSES matches the application validation rules', () => {
    assert.deepEqual(VALID_STATUSES, ['active', 'contaminated', 'discontinued']);
  });
});

describe('listCellCultures filter validation', () => {
  test('rejects an invalid status filter before querying the database', async () => {
    await assert.rejects(
      () => listCellCultures({ status: 'not-a-real-status' }),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects a non-integer incubator_id filter before querying the database', async () => {
    await assert.rejects(
      () => listCellCultures({ incubatorId: 1.5 }),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });
});

describe('updateCellCulture field validation', () => {
  test('rejects an invalid status before checking whether the row exists', async () => {
    // Uses an id that cannot exist (0) — rejecting with the validation
    // message (not "not found") confirms validation ran first.
    await assert.rejects(
      () => updateCellCulture(0, { status: 'not-a-real-status' }),
      (err: unknown) =>
        err instanceof CellCultureError && err.statusCode === 400 && err.message.includes('status must be one of'),
    );
  });

  test('rejects an empty culture_name before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateCellCulture(0, { culture_name: '  ' }),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });
});

