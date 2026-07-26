import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';

export type PermissionKey =
  | 'canManageMoney'
  | 'canManageActions'
  | 'canManageSettings'
  | 'canManageFamily';

/** Must run after `authenticate` + `requireRole('PARENT')`. The fixed admin always passes,
 * regardless of the four booleans, which only restrict non-admin parents. */
export function createRequirePermission(prisma: PrismaClient) {
  return function requirePermission(permission: PermissionKey) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.auth) {
        res.status(401).json({ error: 'UNAUTHENTICATED' });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: req.auth.sub },
        select: { isAdmin: true, [permission]: true },
      });
      if (!user || (!user.isAdmin && !user[permission])) {
        res.status(403).json({ error: 'FORBIDDEN' });
        return;
      }
      next();
    };
  };
}
