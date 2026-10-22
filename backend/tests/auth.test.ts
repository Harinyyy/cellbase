import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  isValidEmail,
  registerUser,
  loginUser,
  VALID_ROLES,
  AuthError,
} from '../src/modules/auth/auth.service';

// These tests exercise validation logic that runs BEFORE any database call,
// so they do not require MongoDB to be running. Full end-to-end checks
// (duplicate email, successful register+login against real data) are listed
// as manual verification steps in the implementation report, since spinning
// up a disposable test database is more infrastructure than an MVP needs.

describe('isValidEmail', () => {
  test('accepts a well-formed email', () => {
    assert.equal(isValidEmail('user@example.com'), true);
  });

  test('rejects a string with no @', () => {
    assert.equal(isValidEmail('not-an-email'), false);
  });

  test('rejects a string with no domain', () => {
    assert.equal(isValidEmail('user@'), false);
  });
});

describe('registerUser input validation', () => {
  test('rejects missing fields before touching the database', async () => {
    await assert.rejects(
      () => registerUser('', '', '', undefined),
      (err: unknown) => err instanceof AuthError && err.statusCode === 400,
    );
  });

  test('rejects an invalid email format', async () => {
    await assert.rejects(
      () => registerUser('Jane Doe', 'not-an-email', 'longenoughpassword', 'researcher'),
      (err: unknown) => err instanceof AuthError && err.statusCode === 400,
    );
  });

  test('rejects a password shorter than 8 characters', async () => {
    await assert.rejects(
      () => registerUser('Jane Doe', 'jane@example.com', 'short', 'researcher'),
      (err: unknown) => err instanceof AuthError && err.statusCode === 400,
    );
  });

  test('rejects a role outside the approved list', async () => {
    await assert.rejects(
      () => registerUser('Jane Doe', 'jane@example.com', 'longenoughpassword', 'superadmin'),
      (err: unknown) => err instanceof AuthError && err.statusCode === 400,
    );
  });

  test('VALID_ROLES matches the application validation rules', () => {
    assert.deepEqual(VALID_ROLES, ['admin', 'researcher']);
  });
});

describe('loginUser input validation', () => {
  test('rejects a missing email or password before touching the database', async () => {
    await assert.rejects(
      () => loginUser('', ''),
      (err: unknown) => err instanceof AuthError && err.statusCode === 400,
    );
  });
});

describe('JWT round-trip (used by login + authenticate middleware)', () => {
  test('a token signed with the app secret verifies successfully', () => {
    const secret = 'test-secret-do-not-use-in-production';
    const payload = { id: 1, email: 'jane@example.com', role: 'researcher' };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret) as typeof payload;

    assert.equal(decoded.id, payload.id);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
  });

  test('a token verified with the wrong secret is rejected', () => {
    const token = jwt.sign({ id: 1 }, 'correct-secret');
    assert.throws(() => jwt.verify(token, 'wrong-secret'));
  });

  test('an expired token is rejected', () => {
    const secret = 'test-secret-do-not-use-in-production';
    const token = jwt.sign({ id: 1 }, secret, { expiresIn: -1 }); // already expired
    assert.throws(() => jwt.verify(token, secret));
  });
});

