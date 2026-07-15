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

export interface FamilyOwnerPayload {
  familyId: string;
  ownerEmail: string;
}

export function signFamilyOwnerToken(payload: FamilyOwnerPayload): string {
  return jwt.sign(payload, env.familyOwnerSecret, { expiresIn: env.familyOwnerTtlSeconds });
}

export function verifyFamilyOwnerToken(token: string): FamilyOwnerPayload | null {
  try {
    return jwt.verify(token, env.familyOwnerSecret) as FamilyOwnerPayload;
  } catch {
    return null;
  }
}

export interface EmailActionPayload {
  familyId: string;
  email: string;
  action: 'verify-email' | 'delete-account' | 'reset-password';
}

const EMAIL_ACTION_TTL_SECONDS: Record<EmailActionPayload['action'], number> = {
  // Generous — verifying an email is low-risk and shouldn't force a re-send just
  // because the user opened their inbox a day later.
  'verify-email': 60 * 60 * 24 * 3,
  // Short — deleting the whole family is irreversible, so the link should go stale fast.
  'delete-account': 60 * 60,
  // Short — a password-reset link grants a credential change, same risk class as deletion.
  'reset-password': 60 * 60,
};

export function signEmailActionToken(payload: EmailActionPayload): string {
  return jwt.sign(payload, env.emailActionSecret, { expiresIn: EMAIL_ACTION_TTL_SECONDS[payload.action] });
}

export function verifyEmailActionToken(token: string): EmailActionPayload | null {
  try {
    return jwt.verify(token, env.emailActionSecret) as EmailActionPayload;
  } catch {
    return null;
  }
}

/** Same purpose as EmailActionPayload but addressed to a single family member's own
 * account (User.passwordHash) rather than the family-owner login — the two are separate
 * identity domains, so this can't reuse EmailActionPayload's {familyId, email} shape. */
export interface MemberActionPayload {
  userId: string;
  action: 'reset-password';
}

const MEMBER_ACTION_TTL_SECONDS: Record<MemberActionPayload['action'], number> = {
  'reset-password': 60 * 60,
};

export function signMemberActionToken(payload: MemberActionPayload): string {
  return jwt.sign(payload, env.emailActionSecret, { expiresIn: MEMBER_ACTION_TTL_SECONDS[payload.action] });
}

export function verifyMemberActionToken(token: string): MemberActionPayload | null {
  try {
    return jwt.verify(token, env.emailActionSecret) as MemberActionPayload;
  } catch {
    return null;
  }
}
