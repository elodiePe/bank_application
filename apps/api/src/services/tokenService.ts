import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@banque-familiale/shared';
import { env } from '../utils/env.js';

export interface AccessTokenPayload {
  sub: string;
  familyId: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtlSeconds });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshTtlSeconds });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
  } catch {
    return null;
  }
}

/** Refresh tokens are stored hashed (never in plaintext) so a DB leak can't be replayed. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
