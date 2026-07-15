import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import type { FamilyMemberDetail } from '@banque-familiale/shared';
import { createUserRepository } from '../repositories/userRepository.js';
import { createRefreshSessionRepository } from '../repositories/refreshSessionRepository.js';
import { createAuditLogRepository } from '../repositories/auditLogRepository.js';
import { hashPassword, hashPin } from './authStrategies.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { sendEmail } from './emailService.js';
import { passwordChangedTemplate, resetMemberPasswordRequestTemplate } from '../emails/templates.js';
import { signMemberActionToken, verifyMemberActionToken } from './tokenService.js';
import { createNotificationService } from './notificationService.js';
import { env } from '../utils/env.js';

function toDetail(u: {
  id: string;
  firstName: string;
  role: 'PARENT' | 'CHILD';
  email: string | null;
  passwordHash: string | null;
  pinHash: string | null;
  deactivatedAt: Date | null;
}): FamilyMemberDetail {
  return {
    id: u.id,
    firstName: u.firstName,
    role: u.role,
    email: u.email,
    hasPasswordLogin: u.passwordHash !== null,
    hasPinLogin: u.pinHash !== null,
    isActive: u.deactivatedAt === null,
  };
}

export function createMemberService(prisma: PrismaClient) {
  const userRepo = createUserRepository(prisma);
  const refreshSessionRepo = createRefreshSessionRepository(prisma);
  const auditLogRepo = createAuditLogRepository(prisma);
  const notificationService = createNotificationService(prisma);

  async function assertBelongsToFamily(userId: string, familyId: string) {
    const user = await userRepo.findById(userId);
    if (!user || user.familyId !== familyId) throw new NotFoundError('Membre introuvable');
    return user;
  }

  async function createUser(params: {
    familyId: string;
    firstName: string;
    role: 'PARENT' | 'CHILD';
    password?: string;
    pin?: string;
  }) {
    const passwordHash = params.password ? await hashPassword(params.password) : null;
    const pinHash = params.pin ? await hashPin(params.pin) : null;
    const id = randomUUID();

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id,
          familyId: params.familyId,
          role: params.role,
          firstName: params.firstName,
          passwordHash,
          pinHash,
        },
      });
      if (params.role === 'CHILD') {
        await tx.childAccount.create({ data: { userId: user.id, balanceCents: 0 } });
      }
      return user;
    });
  }

  return {
    async listMembers(familyId: string): Promise<FamilyMemberDetail[]> {
      const members = await userRepo.listAllFamilyMembers(familyId);
      return members.map(toDetail);
    },

    async setOwnEmail(userId: string, email: string) {
      const existing = await userRepo.findByEmail(email);
      if (existing && existing.id !== userId) {
        throw new ConflictError('Cette adresse e-mail est déjà utilisée par un autre compte.');
      }
      await userRepo.setEmail(userId, email);
    },

    async changeOwnPassword(params: { userId: string; currentPassword: string; newPassword: string }) {
      const user = await userRepo.findById(params.userId);
      if (!user || !user.passwordHash) throw new ForbiddenError();
      const ok = await bcrypt.compare(params.currentPassword, user.passwordHash);
      if (!ok) throw new ForbiddenError('Mot de passe actuel incorrect.');
      await userRepo.setPasswordHash(params.userId, await hashPassword(params.newPassword));

      if (user.email) {
        const { subject, html } = passwordChangedTemplate({ firstName: user.firstName });
        void sendEmail({ to: user.email, subject, html });
      }
    },

    async changeOwnPin(params: { userId: string; currentPin: string; newPin: string }) {
      const user = await userRepo.findById(params.userId);
      if (!user || !user.pinHash) throw new ForbiddenError();
      const ok = await bcrypt.compare(params.currentPin, user.pinHash);
      if (!ok) throw new ForbiddenError('Code PIN actuel incorrect.');
      await userRepo.setPinHash(params.userId, await hashPin(params.newPin));
    },

    async addFamilyMember(params: {
      familyId: string;
      actorId: string;
      firstName: string;
      role: 'PARENT' | 'CHILD';
      password?: string;
      pin?: string;
    }): Promise<FamilyMemberDetail> {
      const created = await createUser({
        familyId: params.familyId,
        firstName: params.firstName,
        role: params.role,
        password: params.password,
        pin: params.pin,
      });

      await auditLogRepo.record({
        actorId: params.actorId,
        action: 'MEMBER_ADDED',
        entityType: 'User',
        entityId: created.id,
        metadata: { firstName: params.firstName, role: params.role },
      });

      const full = await userRepo.listAllFamilyMembers(params.familyId);
      const detail = full.find((m) => m.id === created.id);
      if (!detail) throw new NotFoundError();
      return toDetail(detail);
    },

    // Bootstrap: a freshly registered family has zero members and no way to log in yet,
    // since every other member-management route requires an already-authenticated member.
    // This lets the family owner (email/password session) create the very first parent —
    // but only while the family is still empty, so it can't be used to add members later.
    async createFirstParent(params: {
      familyId: string;
      firstName: string;
      password: string;
    }): Promise<FamilyMemberDetail> {
      const existing = await userRepo.listAllFamilyMembers(params.familyId);
      if (existing.length > 0) {
        throw new ForbiddenError('Cette famille a déjà des membres.');
      }

      const created = await createUser({
        familyId: params.familyId,
        firstName: params.firstName,
        role: 'PARENT',
        password: params.password,
      });

      await auditLogRepo.record({
        actorId: created.id,
        action: 'MEMBER_ADDED',
        entityType: 'User',
        entityId: created.id,
        metadata: { firstName: params.firstName, role: 'PARENT', bootstrap: true },
      });

      const full = await userRepo.listAllFamilyMembers(params.familyId);
      const detail = full.find((m) => m.id === created.id);
      if (!detail) throw new NotFoundError();
      return toDetail(detail);
    },

    async resetCredential(params: {
      familyId: string;
      actorId: string;
      targetUserId: string;
      newPassword?: string;
      newPin?: string;
    }) {
      const target = await assertBelongsToFamily(params.targetUserId, params.familyId);

      if (params.newPassword) {
        if (target.role !== 'PARENT') {
          throw new ValidationError('Seuls les comptes parent ont un mot de passe.');
        }
        await userRepo.setPasswordHash(target.id, await hashPassword(params.newPassword));
      }
      if (params.newPin) {
        if (target.role !== 'CHILD') {
          throw new ValidationError('Les comptes parent n\'ont pas de code PIN.');
        }
        await userRepo.setPinHash(target.id, await hashPin(params.newPin));
      }
      if (!params.newPassword && !params.newPin) {
        throw new ValidationError('Aucun nouveau mot de passe ni code PIN fourni.');
      }

      // Force re-login everywhere: a credential reset should invalidate existing sessions.
      await refreshSessionRepo.revokeAllForUser(target.id);

      await auditLogRepo.record({
        actorId: params.actorId,
        action: 'CREDENTIAL_RESET',
        entityType: 'User',
        entityId: target.id,
      });
    },

    /** A parent forgot their own password, before logging in — this is family-owner-scoped
     * (not member-authenticated, since there is no active member session yet). */
    async requestPasswordReset(familyId: string, targetUserId: string) {
      const target = await assertBelongsToFamily(targetUserId, familyId);
      if (target.role !== 'PARENT') {
        throw new ValidationError('Seuls les comptes parent ont un mot de passe.');
      }
      if (!target.email) {
        throw new ValidationError(
          "Aucune adresse e-mail n'est enregistrée pour ce compte. Demande à un autre parent de réinitialiser ton mot de passe.",
        );
      }

      const resetToken = signMemberActionToken({ userId: target.id, action: 'reset-password' });
      const { subject, html } = resetMemberPasswordRequestTemplate({
        firstName: target.firstName,
        resetUrl: `${env.webOrigin}/reset-password?type=member&token=${resetToken}`,
      });
      await sendEmail({ to: target.email, subject, html });
    },

    async confirmPasswordReset(params: { token: string; newPassword: string }) {
      const payload = verifyMemberActionToken(params.token);
      if (!payload || payload.action !== 'reset-password') {
        throw new ValidationError('Ce lien de réinitialisation est invalide ou a expiré.');
      }

      const user = await userRepo.findById(payload.userId);
      if (!user) throw new NotFoundError('Membre introuvable');

      await userRepo.setPasswordHash(user.id, await hashPassword(params.newPassword));
      await refreshSessionRepo.revokeAllForUser(user.id);

      if (user.email) {
        const { subject, html } = passwordChangedTemplate({ firstName: user.firstName });
        void sendEmail({ to: user.email, subject, html });
      }
    },

    /** A child forgot their PIN — there is no email to reset it with, so instead every
     * parent in the family gets notified and can reset it in person via the existing
     * in-app "Gestion de la famille" panel (resetCredential above). */
    async requestPinResetNotification(familyId: string, targetUserId: string) {
      const target = await assertBelongsToFamily(targetUserId, familyId);
      if (target.role !== 'CHILD') {
        throw new ValidationError("Les comptes parent n'ont pas de code PIN.");
      }

      await notificationService.notifyParentsOfCredentialResetRequest({
        familyId,
        requesterFirstName: target.firstName,
      });
    },

    async deactivateMember(params: {
      familyId: string;
      actorId: string;
      targetUserId: string;
      confirmEmail: string;
    }) {
      if (params.actorId === params.targetUserId) {
        throw new ForbiddenError('Impossible de désactiver son propre compte.');
      }

      const actor = await userRepo.findById(params.actorId);
      if (!actor || !actor.email) {
        throw new ForbiddenError("Ajoute d'abord ton adresse e-mail avant de pouvoir désactiver un compte.");
      }
      if (actor.email.toLowerCase() !== params.confirmEmail.trim().toLowerCase()) {
        throw new ForbiddenError("L'adresse e-mail de confirmation ne correspond pas.");
      }

      const target = await assertBelongsToFamily(params.targetUserId, params.familyId);

      if (target.role === 'PARENT') {
        const members = await userRepo.listAllFamilyMembers(params.familyId);
        const activeParents = members.filter(
          (m) => m.role === 'PARENT' && m.deactivatedAt === null && m.id !== target.id,
        );
        if (activeParents.length === 0) {
          throw new ForbiddenError('Impossible de désactiver le dernier parent actif de la famille.');
        }
      }

      await userRepo.deactivate(target.id);
      await refreshSessionRepo.revokeAllForUser(target.id);

      await auditLogRepo.record({
        actorId: params.actorId,
        action: 'MEMBER_DEACTIVATED',
        entityType: 'User',
        entityId: target.id,
      });
    },
  };
}

export type MemberService = ReturnType<typeof createMemberService>;
