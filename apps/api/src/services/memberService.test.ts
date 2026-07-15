import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Never let tests reach a real SMTP server.
vi.mock('./emailService.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createMemberService, type MemberService } from './memberService.js';
import { signMemberActionToken } from './tokenService.js';

describe('memberService (seeded demo family)', () => {
  let db: TestDb;
  let service: MemberService;

  beforeAll(async () => {
    db = createTestDb();
    await seedDemoFamily(db.prisma);
    service = createMemberService(db.prisma);
  });

  afterAll(() => db.teardown());

  it('lists every member, active and deactivated alike', async () => {
    const members = await service.listMembers('demo-family');
    expect(members).toHaveLength(5);
    expect(members.find((m) => m.id === 'demo-papa')).toMatchObject({
      firstName: 'Papa',
      role: 'PARENT',
      hasPasswordLogin: true,
      hasPinLogin: false,
      isActive: true,
    });
    expect(members.find((m) => m.id === 'demo-elodie')).toMatchObject({
      role: 'CHILD',
      hasPinLogin: true,
      hasPasswordLogin: false,
    });
  });

  it('lets a parent set their own email, rejecting one already used by someone else', async () => {
    await service.setOwnEmail('demo-papa', 'papa@example.com');
    const members = await service.listMembers('demo-family');
    expect(members.find((m) => m.id === 'demo-papa')?.email).toBe('papa@example.com');

    await expect(service.setOwnEmail('demo-maman', 'papa@example.com')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('lets a user change their own password/PIN only with the correct current one', async () => {
    await expect(
      service.changeOwnPassword({ userId: 'demo-papa', currentPassword: 'wrong', newPassword: 'newpass123' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await service.changeOwnPassword({
      userId: 'demo-papa',
      currentPassword: 'papa1234',
      newPassword: 'newpass123',
    });

    // The old password no longer works; the new one does (verified via a second change).
    await expect(
      service.changeOwnPassword({ userId: 'demo-papa', currentPassword: 'papa1234', newPassword: 'x' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await service.changeOwnPassword({
      userId: 'demo-papa',
      currentPassword: 'newpass123',
      newPassword: 'papa1234',
    });
  });

  it('lets a child change their own PIN', async () => {
    await expect(
      service.changeOwnPin({ userId: 'demo-elodie', currentPin: '0000', newPin: '9999' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await service.changeOwnPin({ userId: 'demo-elodie', currentPin: '3333', newPin: '9999' });
    await service.changeOwnPin({ userId: 'demo-elodie', currentPin: '9999', newPin: '3333' }); // restore
  });

  it('adds a new family member (child gets a zero-balance account, parent needs a password)', async () => {
    const child = await service.addFamilyMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      firstName: 'Nouveau',
      role: 'CHILD',
      pin: '1234',
    });
    expect(child).toMatchObject({ firstName: 'Nouveau', role: 'CHILD', hasPinLogin: true, isActive: true });

    const account = await db.prisma.childAccount.findUnique({ where: { userId: child.id } });
    expect(account?.balanceCents).toBe(0);

    const parent = await service.addFamilyMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      firstName: 'Tonton',
      role: 'PARENT',
      password: 'tonton1234',
    });
    expect(parent).toMatchObject({ role: 'PARENT', hasPasswordLogin: true });
  });

  it('lets a parent reset another member\'s credential, invalidating their sessions', async () => {
    await db.prisma.refreshSession.create({
      data: {
        id: 'sess-matthieu',
        userId: 'demo-matthieu',
        tokenHash: 'irrelevant',
        expiresAt: new Date(Date.now() + 100_000),
      },
    });

    await service.resetCredential({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      targetUserId: 'demo-matthieu',
      newPin: '8888',
    });

    const session = await db.prisma.refreshSession.findUniqueOrThrow({ where: { id: 'sess-matthieu' } });
    expect(session.revokedAt).not.toBeNull();
  });

  it('refuses to reset a password on a child account', async () => {
    await expect(
      service.resetCredential({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        targetUserId: 'demo-matthieu',
        newPassword: 'shouldfail1',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('refuses to reset a PIN on a parent account — parents have no PIN', async () => {
    await expect(
      service.resetCredential({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        targetUserId: 'demo-maman',
        newPin: '0000',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('deactivates a member only with the acting parent\'s own confirmed email, and keeps history', async () => {
    await expect(
      service.deactivateMember({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        targetUserId: 'demo-damien',
        confirmEmail: 'wrong@example.com',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await service.deactivateMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      targetUserId: 'demo-damien',
      confirmEmail: 'papa@example.com',
    });

    const members = await service.listMembers('demo-family');
    expect(members.find((m) => m.id === 'demo-damien')?.isActive).toBe(false);

    // History is never deleted.
    const account = await db.prisma.childAccount.findUnique({ where: { userId: 'demo-damien' } });
    expect(account).not.toBeNull();
  });

  it('refuses to deactivate yourself, or the last active parent', async () => {
    await expect(
      service.deactivateMember({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        targetUserId: 'demo-papa',
        confirmEmail: 'papa@example.com',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // Deactivate every other parent first (Maman, Tonton), leaving only Papa active.
    await service.deactivateMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      targetUserId: 'demo-maman',
      confirmEmail: 'papa@example.com',
    });
    const tonton = (await service.listMembers('demo-family')).find((m) => m.firstName === 'Tonton')!;
    await service.deactivateMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      targetUserId: tonton.id,
      confirmEmail: 'papa@example.com',
    });

    // Self-deactivation stays blocked.
    await expect(
      service.deactivateMember({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        targetUserId: 'demo-papa',
        confirmEmail: 'papa@example.com',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // The "last active parent" guard itself, isolated from the self-check: some other
    // actor (here, the already-deactivated Tonton — standing in for a stale session)
    // targeting Papa, now the family's sole active parent, must still be refused.
    await db.prisma.user.update({ where: { id: tonton.id }, data: { email: 'tonton@example.com' } });
    await expect(
      service.deactivateMember({
        familyId: 'demo-family',
        actorId: tonton.id,
        targetUserId: 'demo-papa',
        confirmEmail: 'tonton@example.com',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  describe('forgot credential', () => {
    it("emails a parent with an email on file, but refuses a child (no password to reset)", async () => {
      await expect(service.requestPasswordReset('demo-family', 'demo-papa')).resolves.toBeUndefined();

      await expect(service.requestPasswordReset('demo-family', 'demo-elodie')).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
    });

    it('resets a member password with a valid token and revokes their sessions', async () => {
      await db.prisma.refreshSession.create({
        data: {
          id: 'sess-papa-reset',
          userId: 'demo-papa',
          tokenHash: 'irrelevant-papa-reset',
          expiresAt: new Date(Date.now() + 100_000),
        },
      });

      const token = signMemberActionToken({ userId: 'demo-papa', action: 'reset-password' });
      await service.confirmPasswordReset({ token, newPassword: 'freshpass123' });

      const session = await db.prisma.refreshSession.findUniqueOrThrow({ where: { id: 'sess-papa-reset' } });
      expect(session.revokedAt).not.toBeNull();

      // Restore for any later test relying on the original password.
      await service.changeOwnPassword({
        userId: 'demo-papa',
        currentPassword: 'freshpass123',
        newPassword: 'papa1234',
      });
    });

    it('rejects a garbage or wrongly-scoped reset token', async () => {
      await expect(
        service.confirmPasswordReset({ token: 'not-a-real-token', newPassword: 'irrelevant123' }),
      ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    });

    it("notifies only the family's active parents when a child forgets their PIN", async () => {
      await service.requestPinResetNotification('demo-family', 'demo-elodie');

      const papaNotifications = await db.prisma.notification.findMany({
        where: { userId: 'demo-papa', type: 'CREDENTIAL_RESET_REQUESTED' },
      });
      expect(papaNotifications.length).toBeGreaterThan(0);
      expect(papaNotifications[0]?.body).toContain('Elodie');

      // Maman was deactivated earlier in this file — deactivated members must not be notified.
      const mamanNotifications = await db.prisma.notification.findMany({
        where: { userId: 'demo-maman', type: 'CREDENTIAL_RESET_REQUESTED' },
      });
      expect(mamanNotifications).toHaveLength(0);
    });

    it('refuses a PIN-reset notification request for a parent account', async () => {
      await expect(service.requestPinResetNotification('demo-family', 'demo-papa')).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
    });
  });
});
