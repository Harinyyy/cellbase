import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../modules/auth/auth.service';

/**
 * Restricts a route to specific roles. Must run after `authenticate`,
 * since it relies on req.user being set.
 *
 * Usage (for future modules):
 *   router.post('/incubators', authenticate, requireRole('admin'), createIncubator);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action' });
      return;
    }
    next();
  };
}
