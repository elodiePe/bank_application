import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createRefreshSessionRepository } from '../repositories/refreshSessionRepository.js';
import { createAuditLogRepository } from '../repositories/auditLogRepository.js';
import { createAuthService, type AuthService } from './authService.js';

describe('authService (seeded demo family)', () => {
  let db: TestDb;
  let authService: AuthService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);

    authService = createAuthService(
      {
        userRepository: createUserRepository(db.prisma),
        refreshSessionRepository: createRefreshSessionRepository(db.prisma),
        auditLogRepository: createAuditLogRepository(db.prisma),
      },
      // Short lockout so the "locked" test doesn't need to sleep for 15 real minutes.
      { lockoutMaxAttempts: 3, lockoutDurationMs: 60_000, refreshTtlMs: 30 * 24 * 60 * 60 * 1000 },
    );
  });

  afterAll(() => db.teardown());

  it('lists family members without exposing credential hashes', async () => {
    const members = await authService.listFamilyMembers('demo-family');
    expect(members).toHaveLength(5);
    const papa = members.find((m) => m.id === 'demo-papa');
    expect(papa).toMatchObject({ firstName: 'Papa', role: 'PARENT', hasPinLogin: true });
    expect(papa).not.toHaveProperty('passwordHash');
  });

  it('logs a parent in with the correct password and issues tokens', async () => {
    const result = await authService.loginWithPassword('demo-papa', 'papa1234');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user).toMatchObject({ id: 'demo-papa', role: 'PARENT', firstName: 'Papa' });
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('rejects a wrong password', async () => {
    const result = await authService.loginWithPassword('demo-maman', 'wrong-password');
    expect(result).toEqual({ ok: false, reason: 'invalid_credential' });
  });

  it('refuses password login for a child (children only use a PIN)', async () => {
    const result = await authService.loginWithPassword('demo-elodie', 'anything');
    expect(result).toEqual({ ok: false, reason: 'wrong_role' });
  });

  it('logs a child in with the correct PIN', async () => {
    const result = await authService.loginWithPin('demo-elodie', '3333');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.firstName).toBe('Elodie');
  });

  it('locks the account after too many failed PIN attempts', async () => {
    // lockoutMaxAttempts is 3 for this test instance.
    await authService.loginWithPin('demo-matthieu', '0000');
    await authService.loginWithPin('demo-matthieu', '0000');
    const third = await authService.loginWithPin('demo-matthieu', '0000');
    expect(third).toEqual({ ok: false, reason: 'invalid_credential' });

    const lockedAttempt = await authService.loginWithPin('demo-matthieu', '4444'); // correct PIN
    expect(lockedAttempt).toEqual({ ok: false, reason: 'locked' });
  });

  it('rotates the refresh token and rejects reuse of the old one', async () => {
    const login = await authService.loginWithPin('demo-damien', '5555');
    expect(login.ok).toBe(true);
    if (!login.ok) return;

    const refreshed = await authService.refresh(login.tokens.refreshToken);
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    expect(refreshed.tokens.refreshToken).not.toBe(login.tokens.refreshToken);

    const reuseAttempt = await authService.refresh(login.tokens.refreshToken);
    expect(reuseAttempt).toEqual({ ok: false, reason: 'revoked' });
  });

  it('revokes the session on logout so it can no longer be refreshed', async () => {
    const login = await authService.loginWithPassword('demo-papa', 'papa1234');
    expect(login.ok).toBe(true);
    if (!login.ok) return;

    await authService.logout(login.tokens.refreshToken);

    const refreshAttempt = await authService.refresh(login.tokens.refreshToken);
    expect(refreshAttempt).toEqual({ ok: false, reason: 'revoked' });
  });
});
