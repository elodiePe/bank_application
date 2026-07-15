import type { NextFunction, Request, Response } from 'express';
import { verifyFamilyOwnerToken } from '../services/tokenService.js';
import { FAMILY_OWNER_COOKIE_NAME } from '../utils/cookies.js';

export function requireFamilyOwner(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[FAMILY_OWNER_COOKIE_NAME] as string | undefined;
  const payload = token ? verifyFamilyOwnerToken(token) : null;

  if (!payload) {
    res.status(401).json({ error: 'FAMILY_OWNER_REQUIRED' });
    return;
  }

  req.familyOwner = payload;
  next();
}
