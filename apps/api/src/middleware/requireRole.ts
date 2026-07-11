import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@banque-familiale/shared';

/** Must run after `authenticate` — relies on `req.auth` being set. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }
    next();
  };
}
