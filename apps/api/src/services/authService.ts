import { randomUUID } from 'node:crypto';
import type { Role as PrismaRole, User } from '@prisma/client';
import type { AuthenticatedUser, FamilyMemberSummary } from '@banque-familiale/shared';
import type { UserRepository } from '../repositories/userRepository.js';
import type { RefreshSessionRepository } from '../repositories/refreshSessionRepository.js';
import type { AuditLogRepository } from '../repositories/auditLogRepository.js';
import { pinStrategy, type CredentialStrategy } from './authStrategies.js';
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
    permissions:
      user.role === 'PARENT'
        ? {
            isAdmin: user.isAdmin,
            canManageMoney: user.canManageMoney,
            canManageActions: user.canManageActions,
            canManageSettings: user.canManageSettings,
            canManageFamily: user.canManageFamily,
          }
        : null,
    interfaceLevel: user.role === 'CHILD' ? user.interfaceLevel : null,
    showPointsBalance: user.role === 'CHILD' ? user.showPointsBalance : null,
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
      // Neither write depends on the other's result — running them concurrently instead of
      // one-after-another cuts this down to a single round trip's worth of latency.
      await Promise.all([
        deps.userRepository.recordFailedLogin(userId, { maxAttempts, lockoutMs }),
        deps.auditLogRepository.record({
          actorId: user.id,
          action: 'LOGIN_FAILURE',
          entityType: 'User',
          entityId: user.id,
        }),
      ]);
      return { ok: false, reason: 'invalid_credential' };
    }

    // Same reasoning: resetting the lockout counter, writing the audit log, and issuing
    // tokens (which itself writes the new refresh session) are all independent writes.
    const [, , tokens] = await Promise.all([
      deps.userRepository.resetFailedLogins(userId),
      deps.auditLogRepository.record({
        actorId: user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
      }),
      issueTokens(user),
    ]);
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

    loginWithPin(userId: string, pin: string, familyId: string) {
      return loginWithStrategy(userId, pin, pinStrategy, familyId);
    },

    async refresh(refreshToken: string): Promise<RefreshResult> {
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) return { ok: false, reason: 'invalid' };

      // Rotate: revoke the used token and look up the user in parallel — revoking doesn't need
      // the user record, and the user lookup doesn't need to wait on the revoke, so there's no
      // reason to do these as two sequential round trips like a separate find-then-revoke would.
      const [revokedCount, user] = await Promise.all([
        deps.refreshSessionRepository.revokeActiveByTokenHash(hashToken(refreshToken)),
        deps.userRepository.findById(payload.sub),
      ]);
      if (revokedCount === 0) return { ok: false, reason: 'revoked' };
      if (!user) return { ok: false, reason: 'invalid' };

      const tokens = await issueTokens(user);
      return { ok: true, tokens };
    },

    async logout(refreshToken: string): Promise<void> {
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) return;
      await deps.refreshSessionRepository.revokeActiveByTokenHash(hashToken(refreshToken));
    },

    async getUser(userId: string): Promise<AuthenticatedUser | null> {
      const user = await deps.userRepository.findById(userId);
      return user ? toAuthenticatedUser(user) : null;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
