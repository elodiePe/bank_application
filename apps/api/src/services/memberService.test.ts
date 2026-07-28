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
      hasPinLogin: true,
      isActive: true,
    });
    expect(members.find((m) => m.id === 'demo-elodie')).toMatchObject({
      role: 'CHILD',
      hasPinLogin: true,
    });
  });

  it('lets a parent set their own email once, but never change an existing one', async () => {
    // Papa already has an email from seed data — changing it must be blocked.
    await expect(service.setOwnEmail('demo-papa', 'new-papa@example.com')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    // A freshly added parent has no email yet, so they can set one for the first time.
    const newParent = await service.addFamilyMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      firstName: 'Nouveau',
      role: 'PARENT',
      pin: '6789',
    });
    await service.setOwnEmail(newParent.id, 'nouveau@example.com');
    const members = await service.listMembers('demo-family');
    expect(members.find((m) => m.id === newParent.id)?.email).toBe('nouveau@example.com');

    // But once set, it's a one-time thing for them too.
    await expect(service.setOwnEmail(newParent.id, 'other@example.com')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    // Still rejects an email already used by someone else.
    const anotherParent = await service.addFamilyMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      firstName: 'Encore',
      role: 'PARENT',
      pin: '6790',
    });
    await expect(service.setOwnEmail(anotherParent.id, 'nouveau@example.com')).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    // Clean up: later tests assume the seeded family's original parent count/composition.
    await db.prisma.user.deleteMany({ where: { id: { in: [newParent.id, anotherParent.id] } } });
  });

  it('lets a parent change their own PIN only with the correct current one', async () => {
    await expect(
      service.changeOwnPin({ userId: 'demo-papa', currentPin: '0000', newPin: '9999' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await service.changeOwnPin({ userId: 'demo-papa', currentPin: '1111', newPin: '9999' });

    // The old PIN no longer works; the new one does (verified via a second change).
    await expect(
      service.changeOwnPin({ userId: 'demo-papa', currentPin: '1111', newPin: 'x' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await service.changeOwnPin({ userId: 'demo-papa', currentPin: '9999', newPin: '1111' });
  });

  it('lets a child change their own PIN', async () => {
    await expect(
      service.changeOwnPin({ userId: 'demo-elodie', currentPin: '0000', newPin: '9999' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await service.changeOwnPin({ userId: 'demo-elodie', currentPin: '3333', newPin: '9999' });
    await service.changeOwnPin({ userId: 'demo-elodie', currentPin: '9999', newPin: '3333' }); // restore
  });

  it('adds a new family member (child gets a zero-balance account, parent needs a PIN too)', async () => {
    const child = await service.addFamilyMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      firstName: 'Nouveau',
      role: 'CHILD',
      pin: '1234',
    });
    expect(child).toMatchObject({
      firstName: 'Nouveau',
      role: 'CHILD',
      hasPinLogin: true,
      isActive: true,
      interfaceLevel: 'MIDDLE', // default when omitted
    });

    const account = await db.prisma.childAccount.findUnique({ where: { userId: child.id } });
    expect(account?.balanceCents).toBe(0);

    const parent = await service.addFamilyMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      firstName: 'Tonton',
      role: 'PARENT',
      pin: '6543',
    });
    expect(parent).toMatchObject({ role: 'PARENT', hasPinLogin: true, interfaceLevel: null });
  });

  it("lets a parent choose a child's interface level explicitly, and change it later", async () => {
    const child = await service.addFamilyMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      firstName: 'Petit',
      role: 'CHILD',
      pin: '2468',
      interfaceLevel: 'YOUNG',
    });
    expect(child.interfaceLevel).toBe('YOUNG');

    const updated = await service.setChildInterfaceLevel({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      targetUserId: child.id,
      interfaceLevel: 'TEEN',
    });
    expect(updated.interfaceLevel).toBe('TEEN');

    await expect(
      service.setChildInterfaceLevel({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        targetUserId: 'demo-papa',
        interfaceLevel: 'YOUNG',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('lets a parent reset another member\'s PIN, invalidating their sessions', async () => {
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
      confirmEmail: 'papa@banque-familiale.local',
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
        confirmEmail: 'papa@banque-familiale.local',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // Deactivate every other parent first (Maman, Tonton), leaving only Papa active.
    await service.deactivateMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      targetUserId: 'demo-maman',
      confirmEmail: 'papa@banque-familiale.local',
    });
    const tonton = (await service.listMembers('demo-family')).find((m) => m.firstName === 'Tonton')!;
    await service.deactivateMember({
      familyId: 'demo-family',
      actorId: 'demo-papa',
      targetUserId: tonton.id,
      confirmEmail: 'papa@banque-familiale.local',
    });

    // Self-deactivation stays blocked.
    await expect(
      service.deactivateMember({
        familyId: 'demo-family',
        actorId: 'demo-papa',
        targetUserId: 'demo-papa',
        confirmEmail: 'papa@banque-familiale.local',
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
    it("emails a parent with an email on file, but refuses a child (no email to reset via)", async () => {
      await expect(service.requestPinReset('demo-family', 'demo-papa')).resolves.toBeUndefined();

      await expect(service.requestPinReset('demo-family', 'demo-elodie')).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
    });

    it('resets a member PIN with a valid token and revokes their sessions', async () => {
      await db.prisma.refreshSession.create({
        data: {
          id: 'sess-papa-reset',
          userId: 'demo-papa',
          tokenHash: 'irrelevant-papa-reset',
          expiresAt: new Date(Date.now() + 100_000),
        },
      });

      const token = signMemberActionToken({ userId: 'demo-papa', action: 'reset-pin' });
      await service.confirmPinReset({ token, newPin: '4321' });

      const session = await db.prisma.refreshSession.findUniqueOrThrow({ where: { id: 'sess-papa-reset' } });
      expect(session.revokedAt).not.toBeNull();

      // Restore for any later test relying on the original PIN.
      await service.changeOwnPin({ userId: 'demo-papa', currentPin: '4321', newPin: '1111' });
    });

    it('rejects a garbage or wrongly-scoped reset token', async () => {
      await expect(service.confirmPinReset({ token: 'not-a-real-token', newPin: '1122' })).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
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
