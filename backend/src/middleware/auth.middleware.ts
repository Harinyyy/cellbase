import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserById, UserRole } from '../modules/auth/auth.service';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

// Augments Express's Request type so `req.user` is recognized everywhere
// without needing `as any` casts in route handlers.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the `Authorization: Bearer <token>` header and, on success,
 * attaches the current database profile to req.user. Looking up the user
 * on each request makes role changes and account deletion take effect
 * immediately instead of waiting for a JWT to expire.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET is not configured');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthenticatedUser;
    const user = await getUserById(payload.id);
    if (!user) {
      res.status(401).json({ error: 'Account no longer exists' });
      return;
    }
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    console.error('Failed to verify authenticated account:', err);
    res.status(500).json({ error: 'Unable to verify your account' });
  }
}
