import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createReading, listReadings } from '../src/modules/incubators/readings.service';
import { IncubatorError } from '../src/modules/incubators/incubators.service';

// As in incubators.test.ts: reading validation runs before the incubator
// existence check (see readings.service.ts), so these reject on bad input
// without ever reaching the database — using an id (0) that can never
// exist confirms the DB was not what caused the rejection.

describe('createReading validation', () => {
  test('rejects a missing temperature_c before checking the incubator exists', async () => {
    await assert.rejects(
      () => createReading(0, { co2_percent: 5.0 }, null),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400 && err.message.includes('temperature_c'),
    );
  });

  test('rejects a missing co2_percent before checking the incubator exists', async () => {
    await assert.rejects(
      () => createReading(0, { temperature_c: 37.0 }, null),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400 && err.message.includes('co2_percent'),
    );
  });

  test('rejects a non-numeric humidity_percent', async () => {
    await assert.rejects(
      () =>
        createReading(
          0,
          { temperature_c: 37.0, co2_percent: 5.0, humidity_percent: 'damp' as unknown as number },
          null,
        ),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });

  test('accepts a null humidity_percent (optional field) at the validation stage', async () => {
    // This will proceed past validation and attempt the incubator existence
    // check next, which fails without a live database — so we only assert
    // that it did NOT fail with a 400 validation error.
    await assert.rejects(
      () => createReading(0, { temperature_c: 37.0, co2_percent: 5.0, humidity_percent: null }, null),
      (err: unknown) => !(err instanceof IncubatorError && err.statusCode === 400),
    );
  });
});

describe('listReadings limit validation', () => {
  test('rejects a non-integer limit', async () => {
    await assert.rejects(
      () => listReadings(0, 1.5),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });

  test('rejects a zero or negative limit', async () => {
    await assert.rejects(
      () => listReadings(0, 0),
      (err: unknown) => err instanceof IncubatorError && err.statusCode === 400,
    );
  });
});

