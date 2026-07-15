import { randomUUID } from 'node:crypto';
import type { Role as PrismaRole, User } from '@prisma/client';
import type { AuthenticatedUser, FamilyMemberSummary } from '@banque-familiale/shared';
import type { UserRepository } from '../repositories/userRepository.js';
import type { RefreshSessionRepository } from '../repositories/refreshSessionRepository.js';
import type { AuditLogRepository } from '../repositories/auditLogRepository.js';
import { passwordStrategy, pinStrategy, type CredentialStrategy } from './authStrategies.js';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokenService.js';

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface AuthServiceConfig {
  lockoutMaxAttempts?: number;
  lockoutDurationMs?: number;
  refreshTtlMs: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export type LoginFailureReason = 'not_found' | 'wrong_role' | 'invalid_credential' | 'locked' | 'deactivated';

export type LoginResult =
  | { ok: true; user: AuthenticatedUser; tokens: IssuedTokens }
  | { ok: false; reason: LoginFailureReason };

export type RefreshResult =
  | { ok: true; tokens: IssuedTokens }
  | { ok: false; reason: 'invalid' | 'expired' | 'revoked' };

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    familyId: user.familyId,
    firstName: user.firstName,
    role: user.role,
    email: user.email,
  };
}

export function createAuthService(
  deps: {
    userRepository: UserRepository;
    refreshSessionRepository: RefreshSessionRepository;
    auditLogRepository: AuditLogRepository;
  },
  config: AuthServiceConfig,
) {
  const maxAttempts = config.lockoutMaxAttempts ?? LOCKOUT_MAX_ATTEMPTS;
  const lockoutMs = config.lockoutDurationMs ?? LOCKOUT_DURATION_MS;

  async function issueTokens(user: User): Promise<IssuedTokens> {
    const sessionId = randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, sid: sessionId });
    await deps.refreshSessionRepository.create({
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + config.refreshTtlMs),
    });
    const accessToken = signAccessToken({ sub: user.id, familyId: user.familyId, role: user.role });
    return { accessToken, refreshToken };
  }

  async function loginWithStrategy(
    userId: string,
    credential: string,
    strategy: CredentialStrategy,
    expectedFamilyId: string,
    expectedRole?: PrismaRole,
  ): Promise<LoginResult> {
    const user = await deps.userRepository.findById(userId);
    // Wrong family reads as "not found" — never confirm a userId exists in another tenant.
    if (!user || user.familyId !== expectedFamilyId) return { ok: false, reason: 'not_found' };
    if (user.deactivatedAt) return { ok: false, reason: 'deactivated' };
    if (expectedRole && user.role !== expectedRole) return { ok: false, reason: 'wrong_role' };

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return { ok: false, reason: 'locked' };
    }

    const valid = await strategy.verify(user, credential);
    if (!valid) {
      await deps.userRepository.recordFailedLogin(userId, { maxAttempts, lockoutMs });
      await deps.auditLogRepository.record({
        actorId: user.id,
        action: 'LOGIN_FAILURE',
        entityType: 'User',
        entityId: user.id,
      });
      return { ok: false, reason: 'invalid_credential' };
    }

    await deps.userRepository.resetFailedLogins(userId);
    await deps.auditLogRepository.record({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
    });

    const tokens = await issueTokens(user);
    return { ok: true, user: toAuthenticatedUser(user), tokens };
  }

  return {
    async listFamilyMembers(familyId: string): Promise<FamilyMemberSummary[]> {
      const members = await deps.userRepository.listFamilyMembers(familyId);
      return members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        role: m.role,
        hasPinLogin: m.pinHash !== null,
      }));
    },

    loginWithPassword(userId: string, password: string, familyId: string) {
      return loginWithStrategy(userId, password, passwordStrategy, familyId, 'PARENT');
    },

    loginWithPin(userId: string, pin: string, familyId: string) {
      return loginWithStrategy(userId, pin, pinStrategy, familyId);
    },

    async refresh(refreshToken: string): Promise<RefreshResult> {
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) return { ok: false, reason: 'invalid' };

      const session = await deps.refreshSessionRepository.findActiveByTokenHash(
        hashToken(refreshToken),
      );
      if (!session) return { ok: false, reason: 'revoked' };

      // Rotate: revoke the used token and issue a brand new pair.
      await deps.refreshSessionRepository.revoke(session.id);

      const user = await deps.userRepository.findById(payload.sub);
      if (!user) return { ok: false, reason: 'invalid' };

      const tokens = await issueTokens(user);
      return { ok: true, tokens };
    },

    async logout(refreshToken: string): Promise<void> {
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) return;
      const session = await deps.refreshSessionRepository.findActiveByTokenHash(
        hashToken(refreshToken),
      );
      if (session) {
        await deps.refreshSessionRepository.revoke(session.id);
      }
    },

    async getUser(userId: string): Promise<AuthenticatedUser | null> {
      const user = await deps.userRepository.findById(userId);
      return user ? toAuthenticatedUser(user) : null;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
