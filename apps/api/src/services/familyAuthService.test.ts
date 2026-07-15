import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Never let tests reach a real SMTP server — sendEmail is fire-and-forget/best-effort in
// the services under test, but a real network call is slow and flaky in CI regardless.
vi.mock('./emailService.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createFamilyAuthService, type FamilyAuthService } from './familyAuthService.js';
import { createMemberService } from './memberService.js';
import { createMoneyService } from './moneyService.js';
import { signEmailActionToken } from './tokenService.js';

describe('familyAuthService', () => {
  let db: TestDb;
  let service: FamilyAuthService;

  beforeAll(() => {
    db = createTestDb();
    service = createFamilyAuthService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('registers a new family with a hashed owner password and issues a token', async () => {
    const result = await service.registerFamily({
      familyName: 'Famille Test',
      ownerEmail: 'owner@test.example',
      ownerPassword: 'super-secret-1',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toBeTruthy();

    const family = await db.prisma.family.findUniqueOrThrow({ where: { id: result.familyId } });
    expect(family.ownerPasswordHash).not.toBe('super-secret-1'); // never stored in plaintext
  });

  it('refuses to register a second family with the same owner email', async () => {
    const result = await service.registerFamily({
      familyName: 'Doublon',
      ownerEmail: 'owner@test.example',
      ownerPassword: 'whatever-1',
    });
    expect(result).toEqual({ ok: false, reason: 'email_taken' });
  });

  it('logs the owner in with the correct password, and isolates two families from each other', async () => {
    const other = await service.registerFamily({
      familyName: 'Famille Deux',
      ownerEmail: 'owner2@test.example',
      ownerPassword: 'another-secret-1',
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;

    const login = await service.loginFamilyOwner({
      ownerEmail: 'owner@test.example',
      ownerPassword: 'super-secret-1',
    });
    expect(login.ok).toBe(true);
    if (!login.ok) return;

    expect(login.familyId).not.toBe(other.familyId);
  });

  it('rejects a wrong password without revealing whether the email exists', async () => {
    const result = await service.loginFamilyOwner({
      ownerEmail: 'owner@test.example',
      ownerPassword: 'not-the-password',
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_credential' });

    const unknownEmail = await service.loginFamilyOwner({
      ownerEmail: 'nobody@test.example',
      ownerPassword: 'irrelevant',
    });
    expect(unknownEmail).toEqual({ ok: false, reason: 'not_found' });
  });

  it('verifies the owner email with a valid token', async () => {
    const reg = await service.registerFamily({
      familyName: 'Verif Family',
      ownerEmail: 'verify@test.example',
      ownerPassword: 'verify-secret-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const token = signEmailActionToken({
      familyId: reg.familyId,
      email: 'verify@test.example',
      action: 'verify-email',
    });
    const result = await service.verifyEmail(token);
    expect(result).toEqual({ ok: true });

    const family = await db.prisma.family.findUniqueOrThrow({ where: { id: reg.familyId } });
    expect(family.ownerEmailVerifiedAt).not.toBeNull();
  });

  it('rejects a garbage or forged verify-email token', async () => {
    const result = await service.verifyEmail('not-a-real-token');
    expect(result).toEqual({ ok: false, reason: 'invalid_token' });
  });

  it('confirms account deletion with the correct password and deletes the family', async () => {
    const reg = await service.registerFamily({
      familyName: 'To Delete',
      ownerEmail: 'delete@test.example',
      ownerPassword: 'delete-secret-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const token = signEmailActionToken({
      familyId: reg.familyId,
      email: 'delete@test.example',
      action: 'delete-account',
    });
    const result = await service.confirmAccountDeletion({ token, ownerPassword: 'delete-secret-1' });
    expect(result).toEqual({ ok: true });

    expect(await db.prisma.family.findUnique({ where: { id: reg.familyId } })).toBeNull();
  });

  it('refuses account deletion when the password is wrong, and keeps the family intact', async () => {
    const reg = await service.registerFamily({
      familyName: 'Keep Me',
      ownerEmail: 'keep@test.example',
      ownerPassword: 'keep-secret-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const token = signEmailActionToken({
      familyId: reg.familyId,
      email: 'keep@test.example',
      action: 'delete-account',
    });
    const result = await service.confirmAccountDeletion({ token, ownerPassword: 'wrong-password' });
    expect(result).toEqual({ ok: false, reason: 'invalid_credential' });

    expect(await db.prisma.family.findUnique({ where: { id: reg.familyId } })).not.toBeNull();
  });

  it('cascades deletion through members, accounts and transactions without FK errors', async () => {
    const reg = await service.registerFamily({
      familyName: 'Cascade Family',
      ownerEmail: 'cascade@test.example',
      ownerPassword: 'cascade-secret-1',
    });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;

    const memberService = createMemberService(db.prisma);
    const parent = await memberService.createFirstParent({
      familyId: reg.familyId,
      firstName: 'Parent',
      password: 'parent-secret-1',
    });
    const child = await memberService.addFamilyMember({
      familyId: reg.familyId,
      actorId: parent.id,
      firstName: 'Kid',
      role: 'CHILD',
      pin: '1234',
    });

    const moneyService = createMoneyService(db.prisma);
    const childAccount = await db.prisma.childAccount.findUniqueOrThrow({ where: { userId: child.id } });
    await moneyService.deposit({
      accountId: childAccount.id,
      familyId: reg.familyId,
      amountCents: 500,
      validatedById: parent.id,
    });

    const token = signEmailActionToken({
      familyId: reg.familyId,
      email: 'cascade@test.example',
      action: 'delete-account',
    });
    const result = await service.confirmAccountDeletion({ token, ownerPassword: 'cascade-secret-1' });
    expect(result).toEqual({ ok: true });

    expect(await db.prisma.family.findUnique({ where: { id: reg.familyId } })).toBeNull();
    expect(await db.prisma.user.findUnique({ where: { id: parent.id } })).toBeNull();
    expect(await db.prisma.user.findUnique({ where: { id: child.id } })).toBeNull();
    expect(await db.prisma.transaction.findMany({ where: { accountId: childAccount.id } })).toHaveLength(0);
  });

  describe('password reset', () => {
    it('resets the owner password with a valid token and it works for the next login', async () => {
      const reg = await service.registerFamily({
        familyName: 'Reset Family',
        ownerEmail: 'reset@test.example',
        ownerPassword: 'original-secret-1',
      });
      expect(reg.ok).toBe(true);
      if (!reg.ok) return;

      await service.requestPasswordReset('reset@test.example');

      const token = signEmailActionToken({
        familyId: reg.familyId,
        email: 'reset@test.example',
        action: 'reset-password',
      });
      const result = await service.confirmPasswordReset({ token, newPassword: 'brand-new-secret-1' });
      expect(result).toEqual({ ok: true });

      const oldLogin = await service.loginFamilyOwner({
        ownerEmail: 'reset@test.example',
        ownerPassword: 'original-secret-1',
      });
      expect(oldLogin).toEqual({ ok: false, reason: 'invalid_credential' });

      const newLogin = await service.loginFamilyOwner({
        ownerEmail: 'reset@test.example',
        ownerPassword: 'brand-new-secret-1',
      });
      expect(newLogin.ok).toBe(true);
    });

    it('silently no-ops for an unknown email, so existence cannot be enumerated', async () => {
      await expect(service.requestPasswordReset('nobody-at-all@test.example')).resolves.toBeUndefined();
    });

    it('rejects a token signed for a different action', async () => {
      const reg = await service.registerFamily({
        familyName: 'Wrong Action Family',
        ownerEmail: 'wrongaction@test.example',
        ownerPassword: 'whatever-secret-1',
      });
      expect(reg.ok).toBe(true);
      if (!reg.ok) return;

      const token = signEmailActionToken({
        familyId: reg.familyId,
        email: 'wrongaction@test.example',
        action: 'verify-email',
      });
      const result = await service.confirmPasswordReset({ token, newPassword: 'irrelevant-secret-1' });
      expect(result).toEqual({ ok: false, reason: 'invalid_token' });
    });

    it('clears a lockout on successful reset', async () => {
      // 5 sequential bcrypt.compare calls to trigger the lockout cost more than the
      // default 5s test timeout on their own — nothing wrong is happening, bcrypt is
      // just intentionally slow.
      const reg = await service.registerFamily({
        familyName: 'Locked Family',
        ownerEmail: 'locked@test.example',
        ownerPassword: 'locked-secret-1',
      });
      expect(reg.ok).toBe(true);
      if (!reg.ok) return;

      for (let i = 0; i < 5; i++) {
        await service.loginFamilyOwner({ ownerEmail: 'locked@test.example', ownerPassword: 'wrong' });
      }
      const lockedOut = await service.loginFamilyOwner({
        ownerEmail: 'locked@test.example',
        ownerPassword: 'locked-secret-1',
      });
      expect(lockedOut).toEqual({ ok: false, reason: 'locked' });

      const token = signEmailActionToken({
        familyId: reg.familyId,
        email: 'locked@test.example',
        action: 'reset-password',
      });
      await service.confirmPasswordReset({ token, newPassword: 'unlocked-secret-1' });

      const afterReset = await service.loginFamilyOwner({
        ownerEmail: 'locked@test.example',
        ownerPassword: 'unlocked-secret-1',
      });
      expect(afterReset.ok).toBe(true);
    }, 15_000);
  });
});
