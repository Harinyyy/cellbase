import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createObservation,
  updateObservation,
  ObservationError,
} from '../src/modules/experiments/observations.service';

// As with experiments.test.ts: field-shape validation runs before any
// database call, so these reject on bad input without needing MongoDB.
// Checks that require a DB round-trip (experiment existence, actual row
// lookups) are listed as manual verification steps in the implementation
// report, using an id (0) that can never exist to confirm a rejection
// came from validation and not a DB error.

describe('createObservation validation', () => {
  test('rejects a missing description before checking the experiment exists', async () => {
    await assert.rejects(
      () => createObservation(0, {}, 1),
      (err: unknown) => err instanceof ObservationError && err.statusCode === 400 && err.message.includes('description'),
    );
  });

  test('rejects a blank description', async () => {
    await assert.rejects(
      () => createObservation(0, { description: '   ' }, 1),
      (err: unknown) => err instanceof ObservationError && err.statusCode === 400,
    );
  });

  test('rejects a non-numeric measurement_value', async () => {
    await assert.rejects(
      () =>
        createObservation(
          0,
          { description: 'Confluency check', measurement_value: 'high' as unknown as number },
          1,
        ),
      (err: unknown) => err instanceof ObservationError && err.statusCode === 400,
    );
  });

  test('rejects a non-string measurement_unit', async () => {
    await assert.rejects(
      () =>
        createObservation(
          0,
          { description: 'Confluency check', measurement_unit: 42 as unknown as string },
          1,
        ),
      (err: unknown) => err instanceof ObservationError && err.statusCode === 400,
    );
  });

  test('accepts a null measurement_value and measurement_unit (both optional)', async () => {
    // Passes validation, then fails on the experiment existence check for
    // a nonexistent id — proving null did NOT trigger a 400.
    await assert.rejects(
      () =>
        createObservation(
          0,
          { description: 'Confluency check', measurement_value: null, measurement_unit: null },
          1,
        ),
      (err: unknown) => !(err instanceof ObservationError && err.statusCode === 400),
    );
  });

});

describe('updateObservation field validation', () => {
  test('rejects an empty description before checking whether the row exists', async () => {
    // Uses an id that cannot exist (0) — rejecting with the validation
    // message (not "not found") confirms validation ran first.
    await assert.rejects(
      () => updateObservation(0, { description: '  ' }),
      (err: unknown) => err instanceof ObservationError && err.statusCode === 400,
    );
  });

  test('rejects a non-numeric measurement_value before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateObservation(0, { measurement_value: 'lots' as unknown as number }),
      (err: unknown) => err instanceof ObservationError && err.statusCode === 400,
    );
  });

  test('rejects a non-string measurement_unit before checking whether the row exists', async () => {
    await assert.rejects(
      () => updateObservation(0, { measurement_unit: 7 as unknown as string }),
      (err: unknown) => err instanceof ObservationError && err.statusCode === 400,
    );
  });

  test('accepts a null measurement_value at the validation stage', async () => {
    // Passes validation, then fails on the DB existence check for a
    // nonexistent id — proving null did NOT trigger a 400.
    await assert.rejects(
      () => updateObservation(0, { measurement_value: null }),
      (err: unknown) => !(err instanceof ObservationError && err.statusCode === 400),
    );
  });
});

