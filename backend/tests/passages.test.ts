import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createPassage } from '../src/modules/cellCultures/passages.service';
import { CellCultureError } from '../src/modules/cellCultures/cellCultures.service';

// As with cell-cultures.test.ts: passage input validation runs before the
// cell culture existence check (see passages.service.ts), so these reject
// on bad input without ever reaching the database — using a cell_culture_id
// (0) that can never exist confirms the DB was not what caused the rejection.

describe('createPassage validation', () => {
  test('rejects a missing passage_number before checking the culture exists', async () => {
    await assert.rejects(
      () => createPassage(0, { passage_date: '2026-01-01' }, null),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400 && err.message.includes('passage_number'),
    );
  });

  test('rejects a negative passage_number', async () => {
    await assert.rejects(
      () => createPassage(0, { passage_number: -1, passage_date: '2026-01-01' }, null),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects a non-integer passage_number', async () => {
    await assert.rejects(
      () => createPassage(0, { passage_number: 1.5, passage_date: '2026-01-01' }, null),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects a missing passage_date', async () => {
    await assert.rejects(
      () => createPassage(0, { passage_number: 1 }, null),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400 && err.message.includes('passage_date'),
    );
  });

  test('rejects a malformed passage_date', async () => {
    await assert.rejects(
      () => createPassage(0, { passage_number: 1, passage_date: '01/01/2026' }, null),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects a confluency_percent above 100 (matches CHECK BETWEEN 0 AND 100)', async () => {
    await assert.rejects(
      () =>
        createPassage(0, { passage_number: 1, passage_date: '2026-01-01', confluency_percent: 150 }, null),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('rejects a negative confluency_percent', async () => {
    await assert.rejects(
      () =>
        createPassage(0, { passage_number: 1, passage_date: '2026-01-01', confluency_percent: -5 }, null),
      (err: unknown) => err instanceof CellCultureError && err.statusCode === 400,
    );
  });

  test('accepts passage_number of exactly 0 (matches CHECK passage_number >= 0)', async () => {
    // Passes validation (0 is allowed), then fails on the DB existence
    // check for a nonexistent culture id — proving 0 did NOT trigger a 400.
    await assert.rejects(
      () => createPassage(0, { passage_number: 0, passage_date: '2026-01-01' }, null),
      (err: unknown) => !(err instanceof CellCultureError && err.statusCode === 400),
    );
  });
});

