import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { nextId } from '../../db/db';
import { CellCulture, ContaminationLog, CultureSchedule, Experiment, IncubatorReading, MediaBatch, User, plain } from '../../db/models';

export type UserRole = 'admin' | 'researcher';
export const VALID_ROLES: UserRole[] = ['admin', 'researcher'];
const DEFAULT_ROLE: UserRole = 'researcher';

export interface SafeUser {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegistration(fullName: string, email: string, password: string): void {
  if (!fullName || !email || !password) throw new AuthError('full_name, email, and password are required', 400);
  if (!isValidEmail(email)) throw new AuthError('Invalid email format', 400);
  if (password.length < 8) throw new AuthError('Password must be at least 8 characters long', 400);
}

function safeUser(user: any): SafeUser {
  return { id: user.id, full_name: user.full_name, email: user.email, role: user.role, created_at: user.created_at };
}

export async function registerUser(fullName: string, email: string, password: string, role?: string): Promise<SafeUser> {
  validateRegistration(fullName, email, password);
  const finalRole = (role ?? DEFAULT_ROLE) as UserRole;
  if (!VALID_ROLES.includes(finalRole)) throw new AuthError(`role must be one of: ${VALID_ROLES.join(', ')}`, 400);
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) throw new AuthError('An account with this email already exists', 409);
  const user = await User.create({
    id: await nextId('users'), full_name: fullName.trim(), email: normalizedEmail,
    password_hash: await bcrypt.hash(password, 10), role: finalRole, created_at: new Date().toISOString(),
  });
  return safeUser(user);
}

/** Atomically assigns the first public signup the bootstrap admin role. */
export async function registerPublicUser(fullName: string, email: string, password: string): Promise<SafeUser> {
  validateRegistration(fullName, email, password);
  const normalizedEmail = email.toLowerCase().trim();
  const systems = mongoose.connection.collection('system');
  const bootstrapId = 'initial-admin-claimed';
  await systems.updateOne({ _id: bootstrapId } as any, { $setOnInsert: { claimed: false } }, { upsert: true });
  let isFirstUser = false;
  try {
    const claim = await systems.findOneAndUpdate(
      { _id: bootstrapId, claimed: false } as any,
      { $set: { claimed: true } },
      { returnDocument: 'after' },
    );
    isFirstUser = Boolean(claim);
    const user = await User.create({
      id: await nextId('users'), full_name: fullName.trim(), email: normalizedEmail,
      password_hash: await bcrypt.hash(password, 10), role: isFirstUser ? 'admin' : 'researcher',
      created_at: new Date().toISOString(),
    });
    return safeUser(user);
  } catch (err) {
    if (isFirstUser) await systems.updateOne({ _id: bootstrapId } as any, { $set: { claimed: false } });
    if ((err as { code?: number })?.code === 11000) throw new AuthError('An account with this email already exists', 409);
    throw err;
  }
}

export async function listUsers(): Promise<SafeUser[]> {
  const users = await User.find().sort({ created_at: 1, id: 1 }).lean();
  return users.map((user) => safeUser(plain(user)));
}

export async function deleteUser(userId: number, requestingUserId: number): Promise<void> {
  if (!Number.isInteger(userId) || userId <= 0) throw new AuthError('Invalid user id', 400);
  if (userId === requestingUserId) throw new AuthError('You cannot delete your own account while signed in', 400);
  const target = await User.findOne({ id: userId }).lean();
  if (!target) throw new AuthError('User not found', 404);
  if (target.role === 'admin' && await User.countDocuments({ role: 'admin' }) <= 1) {
    throw new AuthError('The last admin account cannot be deleted', 400);
  }
  await User.deleteOne({ id: userId });
  await Promise.all([
    IncubatorReading.updateMany({ recorded_by: userId }, { $set: { recorded_by: null } }),
    MediaBatch.updateMany({ prepared_by: userId }, { $set: { prepared_by: null } }),
    CellCulture.updateMany({ started_by: userId }, { $set: { started_by: null } }),
    CellCulture.updateMany({ 'passages.performed_by': userId }, { $set: { 'passages.$[passage].performed_by': null } }, { arrayFilters: [{ 'passage.performed_by': userId }] }),
    CultureSchedule.updateMany({ assigned_to: userId }, { $set: { assigned_to: null } }),
    ContaminationLog.updateMany({ reported_by: userId }, { $set: { reported_by: null } }),
    Experiment.updateMany({ created_by: userId }, { $set: { created_by: null } }),
    Experiment.updateMany({ 'observations.recorded_by': userId }, { $set: { 'observations.$[observation].recorded_by': null } }, { arrayFilters: [{ 'observation.recorded_by': userId }] }),
  ]);
}

export async function loginUser(email: string, password: string): Promise<{ user: SafeUser; token: string }> {
  if (!email || !password) throw new AuthError('email and password are required', 400);
  const row = await User.findOne({ email: email.toLowerCase().trim() }).select('+password_hash').lean();
  const invalidCredentials = () => new AuthError('Invalid email or password', 401);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) throw invalidCredentials();
  const user = safeUser(row);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AuthError('Server misconfiguration', 500);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as jwt.SignOptions);
  return { user, token };
}

export async function getUserById(id: number): Promise<SafeUser | null> {
  const user = await User.findOne({ id }).lean();
  return user ? safeUser(user) : null;
}
