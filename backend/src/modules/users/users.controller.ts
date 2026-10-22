import { Request, Response } from 'express';
import { AuthError, deleteUser, listUsers, registerUser } from '../auth/auth.service';

function handleError(err: unknown, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unexpected user management error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
}

export async function list(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({ users: await listUsers() });
  } catch (err) {
    handleError(err, res);
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { full_name, email, password, role } = req.body ?? {};
    const user = await registerUser(full_name, email, password, role);
    res.status(201).json({ user });
  } catch (err) {
    handleError(err, res);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const userId = Number(req.params.id);
    await deleteUser(userId, req.user!.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
}
