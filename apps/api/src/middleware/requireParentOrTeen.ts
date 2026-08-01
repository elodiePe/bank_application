import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';

/** Meal-plan and laundry management are parent-only by default, but a TEEN-interface child gets
 * the same rights — old enough to be trusted with the household schedule (unlike MIDDLE/YOUNG).
 * `interfaceLevel` isn't in the access token — it can change after the token was issued (a
 * parent might downgrade a child mid-session) — so this looks it up fresh on every request
 * rather than trusting a possibly-stale claim. */
export function createRequireParentOrTeen(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }
    if (req.auth.role === 'PARENT') {
      next();
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: { interfaceLevel: true } });
    if (user?.interfaceLevel === 'TEEN') {
      next();
      return;
    }
    res.status(403).json({ error: 'FORBIDDEN' });
  };
}
