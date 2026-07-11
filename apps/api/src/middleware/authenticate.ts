import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/tokenService.js';
import { ACCESS_COOKIE_NAME } from '../utils/cookies.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME] as string | undefined;
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  req.auth = payload;
  next();
}
