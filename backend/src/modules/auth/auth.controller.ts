import { Request, Response } from 'express';
import { registerPublicUser, loginUser, getUserById, AuthError } from './auth.service';

function handleAuthError(err: unknown, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  // Anything unexpected (e.g. a DB connectivity issue) is logged server-side
  // only — clients never see raw database/internal error details.
  console.error('Unexpected auth error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { full_name, email, password } = req.body ?? {};
    const user = await registerPublicUser(full_name, email, password);
    res.status(201).json({ user });
  } catch (err) {
    handleAuthError(err, res);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body ?? {};
    const { user, token } = await loginUser(email, password);
    res.status(200).json({ user, token });
  } catch (err) {
    handleAuthError(err, res);
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const user = await getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({ user });
  } catch (err) {
    handleAuthError(err, res);
  }
}
