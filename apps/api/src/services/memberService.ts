import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import type { ChildInterfaceLevel, FamilyMemberDetail } from '@banque-familiale/shared';
import { createUserRepository } from '../repositories/userRepository.js';
import { createRefreshSessionRepository } from '../repositories/refreshSessionRepository.js';
import { createAuditLogRepository } from '../repositories/auditLogRepository.js';
import { hashPin } from './authStrategies.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { sendEmail } from './emailService.js';
import { pinChangedTemplate, resetMemberPinRequestTemplate } from '../emails/templates.js';
import { signMemberActionToken, verifyMemberActionToken } from './tokenService.js';
import { createNotificationService } from './notificationService.js';
import { env } from '../utils/env.js';

function toDetail(u: {
  id: string;
  firstName: string;
  role: 'PARENT' | 'CHILD';
  email: string | null;
  pinHash: string | null;
  deactivatedAt: Date | null;
  isAdmin: boolean;
  canManageMoney: boolean;
  canManageActions: boolean;
  canManageSettings: boolean;
  canManageFamily: boolean;
  interfaceLevel: ChildInterfaceLevel;
}): FamilyMemberDetail {
  return {
    id: u.id,
    firstName: u.firstName,
    role: u.role,
    email: u.email,
    hasPinLogin: u.pinHash !== null,
    isActive: u.deactivatedAt === null,
    permissions:
      u.role === 'PARENT'
        ? {
            isAdmin: u.isAdmin,
            canManageMoney: u.canManageMoney,
            canManageActions: u.canManageActions,
            canManageSettings: u.canManageSettings,
            canManageFamily: u.canManageFamily,
          }
        : null,
    interfaceLevel: u.role === 'CHILD' ? u.interfaceLevel : null,
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
    pin: string;
    email?: string;
    isAdmin?: boolean;
    canManageMoney?: boolean;
    canManageActions?: boolean;
    canManageSettings?: boolean;
    canManageFamily?: boolean;
    interfaceLevel?: ChildInterfaceLevel;
  }) {
    const pinHash = await hashPin(params.pin);
    const id = randomUUID();

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id,
          familyId: params.familyId,
          role: params.role,
          firstName: params.firstName,
          pinHash,
          ...(params.role === 'PARENT' && params.email ? { email: params.email } : {}),
          ...(params.role === 'PARENT'
            ? {
                isAdmin: params.isAdmin ?? false,
                canManageMoney: params.canManageMoney ?? true,
                canManageActions: params.canManageActions ?? true,
                canManageSettings: params.canManageSettings ?? true,
                canManageFamily: params.canManageFamily ?? true,
              }
            : { interfaceLevel: params.interfaceLevel ?? 'MIDDLE' }),
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

    /** A trimmed-down roster for the meal-plan/laundry member pickers — just who exists and
     * whether they're active, never email or the parent-permission booleans. Reachable by a
     * TEEN-interface child (via requireParentOrTeen) as well as a parent, unlike the full
     * `listMembers`, so it must never carry anything a child shouldn't see about a parent. */
    async listHouseholdRoster(familyId: string): Promise<FamilyMemberDetail[]> {
      const members = await userRepo.listFamilyMembers(familyId);
      return members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        role: m.role,
        email: null,
        hasPinLogin: m.pinHash !== null,
        isActive: true,
        permissions: null,
        interfaceLevel: null,
      }));
    },

    /// One-time only: once a parent has an email on file, it can't be changed — it's the
    /// address used to confirm account deletion and other sensitive actions, so letting it
    /// be swapped out would undermine that.
    async setOwnEmail(userId: string, email: string) {
      const current = await userRepo.findById(userId);
      if (current?.email) {
        throw new ForbiddenError('Ton adresse e-mail est déjà définie et ne peut plus être modifiée.');
      }
      const existing = await userRepo.findByEmail(email);
      if (existing && existing.id !== userId) {
        throw new ConflictError('Cette adresse e-mail est déjà utilisée par un autre compte.');
      }
      await userRepo.setEmail(userId, email);
    },

    /// Every member — parent or child — authenticates with a PIN, so this one form covers
    /// both roles now.
    async changeOwnPin(params: { userId: string; currentPin: string; newPin: string }) {
      const user = await userRepo.findById(params.userId);
      if (!user || !user.pinHash) throw new ForbiddenError();
      const ok = await bcrypt.compare(params.currentPin, user.pinHash);
      if (!ok) throw new ForbiddenError('Code PIN actuel incorrect.');
      await userRepo.setPinHash(params.userId, await hashPin(params.newPin));

      if (user.role === 'PARENT' && user.email) {
        const { subject, html } = pinChangedTemplate({ firstName: user.firstName });
        void sendEmail({ to: user.email, subject, html });
      }
    },

    /// Self-service — only a TEEN-interface child can change their own points-display
    /// preference (YOUNG/MIDDLE keep the always-on default, matching the "interface avancée"
    /// scope already used for the Mode gestion toggle).
    async setShowPointsBalance(userId: string, show: boolean) {
      const user = await userRepo.findById(userId);
      if (!user || user.role !== 'CHILD' || user.interfaceLevel !== 'TEEN') throw new ForbiddenError();
      await userRepo.setShowPointsBalance(userId, show);
    },

    async addFamilyMember(params: {
      familyId: string;
      actorId: string;
      firstName: string;
      role: 'PARENT' | 'CHILD';
      pin: string;
      canManageMoney?: boolean;
      canManageActions?: boolean;
      canManageSettings?: boolean;
      canManageFamily?: boolean;
      interfaceLevel?: ChildInterfaceLevel;
    }): Promise<FamilyMemberDetail> {
      const created = await createUser({
        familyId: params.familyId,
        firstName: params.firstName,
        role: params.role,
        pin: params.pin,
        canManageMoney: params.canManageMoney,
        canManageActions: params.canManageActions,
        canManageSettings: params.canManageSettings,
        canManageFamily: params.canManageFamily,
        interfaceLevel: params.interfaceLevel,
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
      pin: string;
      ownerEmail: string;
    }): Promise<FamilyMemberDetail> {
      const existing = await userRepo.listAllFamilyMembers(params.familyId);
      if (existing.length > 0) {
        throw new ForbiddenError('Cette famille a déjà des membres.');
      }

      const created = await createUser({
        familyId: params.familyId,
        firstName: params.firstName,
        role: 'PARENT',
        pin: params.pin,
        email: params.ownerEmail,
        isAdmin: true,
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

    async resetCredential(params: { familyId: string; actorId: string; targetUserId: string; newPin: string }) {
      const target = await assertBelongsToFamily(params.targetUserId, params.familyId);

      await userRepo.setPinHash(target.id, await hashPin(params.newPin));

      // Force re-login everywhere: a credential reset should invalidate existing sessions.
      await refreshSessionRepo.revokeAllForUser(target.id);

      await auditLogRepo.record({
        actorId: params.actorId,
        action: 'CREDENTIAL_RESET',
        entityType: 'User',
        entityId: target.id,
      });
    },

    /** A parent forgot their own PIN, before logging in — this is family-owner-scoped
     * (not member-authenticated, since there is no active member session yet). Only
     * parents have this self-service email flow; children have no email on file, so they
     * use requestPinResetNotification below instead. */
    async requestPinReset(familyId: string, targetUserId: string) {
      const target = await assertBelongsToFamily(targetUserId, familyId);
      if (target.role !== 'PARENT') {
        throw new ValidationError('Seuls les comptes parent peuvent réinitialiser leur code par e-mail.');
      }
      if (!target.email) {
        throw new ValidationError(
          "Aucune adresse e-mail n'est enregistrée pour ce compte. Demande à un autre parent de réinitialiser ton code PIN.",
        );
      }

      const resetToken = signMemberActionToken({ userId: target.id, action: 'reset-pin' });
      const { subject, html } = resetMemberPinRequestTemplate({
        firstName: target.firstName,
        resetUrl: `${env.webAppUrl}/reset-password?type=member&token=${resetToken}`,
      });
      await sendEmail({ to: target.email, subject, html });
    },

    async confirmPinReset(params: { token: string; newPin: string }) {
      const payload = verifyMemberActionToken(params.token);
      if (!payload || payload.action !== 'reset-pin') {
        throw new ValidationError('Ce lien de réinitialisation est invalide ou a expiré.');
      }

      const user = await userRepo.findById(payload.userId);
      if (!user) throw new NotFoundError('Membre introuvable');

      await userRepo.setPinHash(user.id, await hashPin(params.newPin));
      await refreshSessionRepo.revokeAllForUser(user.id);

      if (user.email) {
        const { subject, html } = pinChangedTemplate({ firstName: user.firstName });
        void sendEmail({ to: user.email, subject, html });
      }
    },

    /** A child forgot their PIN — there is no email to reset it with, so instead every
     * parent in the family gets notified and can reset it in person via the existing
     * in-app "Gestion de la famille" panel (resetCredential above). */
    async requestPinResetNotification(familyId: string, targetUserId: string) {
      const target = await assertBelongsToFamily(targetUserId, familyId);
      if (target.role !== 'CHILD') {
        throw new ValidationError("Les parents utilisent le lien envoyé par e-mail pour réinitialiser leur code.");
      }

      await notificationService.notifyParentsOfCredentialResetRequest({
        familyId,
        requesterFirstName: target.firstName,
      });
    },

    /** Change which dashboard variant a child sees — parent-only, chosen directly rather
     * than derived from a birth date. */
    async setChildInterfaceLevel(params: {
      familyId: string;
      actorId: string;
      targetUserId: string;
      interfaceLevel: ChildInterfaceLevel;
    }): Promise<FamilyMemberDetail> {
      const target = await assertBelongsToFamily(params.targetUserId, params.familyId);
      if (target.role !== 'CHILD') {
        throw new ValidationError("Seuls les comptes enfant ont une interface à choisir.");
      }

      await userRepo.setInterfaceLevel(target.id, params.interfaceLevel);

      const full = await userRepo.listAllFamilyMembers(params.familyId);
      const detail = full.find((m) => m.id === target.id);
      if (!detail) throw new NotFoundError();
      return toDetail(detail);
    },

    /** Admin-only: change what a non-admin parent is allowed to do. The admin flag itself
     * is fixed to the first parent and can't be reassigned here. */
    async updatePermissions(params: {
      familyId: string;
      actorId: string;
      targetUserId: string;
      canManageMoney: boolean;
      canManageActions: boolean;
      canManageSettings: boolean;
      canManageFamily: boolean;
    }): Promise<FamilyMemberDetail> {
      const actor = await userRepo.findById(params.actorId);
      if (!actor || !actor.isAdmin) {
        throw new ForbiddenError('Seul l\'administrateur peut modifier les droits des parents.');
      }
      if (params.actorId === params.targetUserId) {
        throw new ForbiddenError('Impossible de modifier ses propres droits.');
      }

      const target = await assertBelongsToFamily(params.targetUserId, params.familyId);
      if (target.role !== 'PARENT') {
        throw new ValidationError('Seuls les comptes parent ont des droits à configurer.');
      }
      if (target.isAdmin) {
        throw new ForbiddenError("Impossible de modifier les droits de l'administrateur.");
      }

      await userRepo.setPermissions(target.id, {
        canManageMoney: params.canManageMoney,
        canManageActions: params.canManageActions,
        canManageSettings: params.canManageSettings,
        canManageFamily: params.canManageFamily,
      });

      await auditLogRepo.record({
        actorId: params.actorId,
        action: 'MEMBER_PERMISSIONS_UPDATED',
        entityType: 'User',
        entityId: target.id,
        metadata: {
          canManageMoney: params.canManageMoney,
          canManageActions: params.canManageActions,
          canManageSettings: params.canManageSettings,
          canManageFamily: params.canManageFamily,
        },
      });

      const full = await userRepo.listAllFamilyMembers(params.familyId);
      const detail = full.find((m) => m.id === target.id);
      if (!detail) throw new NotFoundError();
      return toDetail(detail);
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
