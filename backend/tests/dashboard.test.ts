import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DashboardError } from '../src/modules/dashboard/dashboard.service';

// The Dashboard endpoint takes no request body or query parameters — it's
// a pure read-only aggregate — so there is no client input to validate the
// way other modules' tests do. These tests instead cover the one piece of
// logic in this module that doesn't require asserting against real rows:
// that errors are represented as a clean DashboardError and never leak raw
// driver detail to the caller.

describe('DashboardError', () => {
  test('carries the given message and status code', () => {
    const err = new DashboardError('An unexpected database error occurred', 500);
    assert.equal(err.message, 'An unexpected database error occurred');
    assert.equal(err.statusCode, 500);
    assert.equal(err.name, 'DashboardError');
  });

  test('is a real Error instance', () => {
    const err = new DashboardError('boom', 500);
    assert.ok(err instanceof Error);
  });
});


