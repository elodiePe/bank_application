import type { PrismaClient, MoneyRequest, User } from '@prisma/client';
import type { MoneyRequestSummary } from '@banque-familiale/shared';
import { createMoneyRequestRepository } from '../repositories/moneyRequestRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createMoneyService } from './moneyService.js';
import { createNotificationService } from './notificationService.js';
import { ForbiddenError, InvalidRequestStateError, NotFoundError, ValidationError } from '../utils/errors.js';

type RequestWithRelations = MoneyRequest & {
  requester: User;
  targetUser: User | null;
  respondedBy: User | null;
};

function toSummary(r: RequestWithRelations): MoneyRequestSummary {
  return {
    id: r.id,
    requesterId: r.requesterId,
    requesterFirstName: r.requester.firstName,
    targetUserId: r.targetUserId,
    targetFirstName: r.targetUser?.firstName ?? null,
    type: r.type,
    status: r.status,
    amountCents: r.amountCents,
    comment: r.comment,
    receiptPhotoDataUrl: r.receiptPhotoDataUrl,
    createdAt: r.createdAt.toISOString(),
    respondedByFirstName: r.respondedBy?.firstName ?? null,
    respondedAt: r.respondedAt?.toISOString() ?? null,
  };
}

export function createMoneyRequestService(prisma: PrismaClient) {
  const moneyService = createMoneyService(prisma);
  const notificationService = createNotificationService(prisma);
  const userRepo = createUserRepository(prisma);

  return {
    async createRequest(params: {
      requesterId: string;
      familyId: string;
      type: 'DEPOSIT_REQUEST' | 'WITHDRAWAL_REQUEST' | 'TRANSFER_REQUEST';
      amountCents: number;
      comment?: string;
      targetUserId?: string;
      receiptPhotoDataUrl?: string;
    }): Promise<MoneyRequestSummary> {
      // A receipt photo is only offered to MIDDLE/TEEN children in the UI — enforced here too,
      // rather than trusting the client, since a YOUNG child's requester still has no such flow.
      if (params.receiptPhotoDataUrl) {
        const requester = await userRepo.findById(params.requesterId);
        if (!requester || requester.role !== 'CHILD' || requester.interfaceLevel === 'YOUNG') {
          throw new ValidationError('La photo de ticket n\'est pas disponible pour ce profil');
        }
      }

      let targetUserId: string | undefined;
      if (params.type === 'TRANSFER_REQUEST') {
        if (!params.targetUserId) {
          throw new ValidationError('Choisissez un frère ou une sœur');
        }
        const target = await userRepo.findById(params.targetUserId);
        if (
          !target ||
          target.familyId !== params.familyId ||
          target.role !== 'CHILD' ||
          target.deactivatedAt !== null
        ) {
          throw new ValidationError('Destinataire invalide');
        }
        if (target.id === params.requesterId) {
          throw new ValidationError('Choisissez un autre enfant');
        }
        targetUserId = target.id;
      }

      const moneyRequestRepo = createMoneyRequestRepository(prisma);
      const created = await moneyRequestRepo.create({
        requester: { connect: { id: params.requesterId } },
        type: params.type,
        status: 'PENDING',
        amountCents: params.amountCents,
        comment: params.comment ?? null,
        receiptPhotoDataUrl: params.receiptPhotoDataUrl ?? null,
        ...(targetUserId ? { targetUser: { connect: { id: targetUserId } } } : {}),
      });

      if (targetUserId) {
        await notificationService.notifySiblingOfRequest({
          targetUserId,
          requesterFirstName: created.requester.firstName,
          amountCents: created.amountCents,
          moneyRequestId: created.id,
        });
      } else {
        await notificationService.notifyParentsOfRequest({
          familyId: params.familyId,
          requesterFirstName: created.requester.firstName,
          amountCents: created.amountCents,
          moneyRequestId: created.id,
          isWithdrawal: params.type === 'WITHDRAWAL_REQUEST',
        });
      }

      return toSummary(created);
    },

    async listMine(userId: string): Promise<MoneyRequestSummary[]> {
      const moneyRequestRepo = createMoneyRequestRepository(prisma);
      const requests = await moneyRequestRepo.listForUser(userId);
      return requests.map(toSummary);
    },

    async listPendingForFamily(familyId: string): Promise<MoneyRequestSummary[]> {
      const moneyRequestRepo = createMoneyRequestRepository(prisma);
      const requests = await moneyRequestRepo.listPendingForFamily(familyId);
      return requests.map(toSummary);
    },

    async approve(params: {
      requestId: string;
      actorId: string;
      actorRole: 'PARENT' | 'CHILD';
      actorFamilyId: string;
    }): Promise<MoneyRequestSummary> {
      const moneyRequestRepo = createMoneyRequestRepository(prisma);
      const childAccountRepo = createChildAccountRepository(prisma);

      const request = await moneyRequestRepo.findByIdOrThrow(params.requestId);
      if (request.status !== 'PENDING') {
        throw new InvalidRequestStateError();
      }
      if (request.requester.familyId !== params.actorFamilyId) {
        throw new ForbiddenError();
      }

      if (request.type === 'TRANSFER_REQUEST') {
        if (params.actorId !== request.targetUserId) {
          throw new ForbiddenError('Seul le destinataire peut accepter cette demande');
        }
      } else if (params.actorRole !== 'PARENT') {
        throw new ForbiddenError('Seul un parent peut accepter cette demande');
      }

      const requesterAccount = await childAccountRepo.findByUserId(request.requesterId);
      if (!requesterAccount) throw new NotFoundError('Compte introuvable');

      if (request.type === 'DEPOSIT_REQUEST') {
        await moneyService.deposit({
          accountId: requesterAccount.id,
          familyId: params.actorFamilyId,
          amountCents: request.amountCents,
          comment: request.comment ?? undefined,
          validatedById: params.actorId,
        });
      } else if (request.type === 'WITHDRAWAL_REQUEST') {
        await moneyService.withdrawal({
          accountId: requesterAccount.id,
          familyId: params.actorFamilyId,
          amountCents: request.amountCents,
          comment: request.comment ?? undefined,
          validatedById: params.actorId,
        });
      } else {
        const targetAccount = await childAccountRepo.findByUserId(request.targetUserId!);
        if (!targetAccount) throw new NotFoundError('Compte introuvable');
        await moneyService.transfer({
          fromAccountId: targetAccount.id,
          toAccountId: requesterAccount.id,
          familyId: params.actorFamilyId,
          amountCents: request.amountCents,
          comment: request.comment ?? undefined,
          validatedById: params.actorId,
        });
      }

      const updated = await moneyRequestRepo.updateStatus(request.id, {
        status: 'APPROVED',
        respondedById: params.actorId,
      });

      const actor = await userRepo.findById(params.actorId);
      await notificationService.notifyRequestApproved({
        requesterId: request.requesterId,
        amountCents: request.amountCents,
        approvedByFirstName: actor?.firstName ?? '',
        moneyRequestId: request.id,
      });

      return toSummary(updated);
    },

    async reject(params: {
      requestId: string;
      actorId: string;
      actorRole: 'PARENT' | 'CHILD';
      actorFamilyId: string;
    }): Promise<MoneyRequestSummary> {
      const moneyRequestRepo = createMoneyRequestRepository(prisma);
      const request = await moneyRequestRepo.findByIdOrThrow(params.requestId);
      if (request.status !== 'PENDING') {
        throw new InvalidRequestStateError();
      }
      if (request.requester.familyId !== params.actorFamilyId) {
        throw new ForbiddenError();
      }

      if (request.type === 'TRANSFER_REQUEST') {
        if (params.actorId !== request.targetUserId) {
          throw new ForbiddenError('Seul le destinataire peut refuser cette demande');
        }
      } else if (params.actorRole !== 'PARENT') {
        throw new ForbiddenError('Seul un parent peut refuser cette demande');
      }

      const updated = await moneyRequestRepo.updateStatus(request.id, {
        status: 'REJECTED',
        respondedById: params.actorId,
      });

      const actor = await userRepo.findById(params.actorId);
      await notificationService.notifyRequestRejected({
        requesterId: request.requesterId,
        amountCents: request.amountCents,
        rejectedByFirstName: actor?.firstName ?? '',
        moneyRequestId: request.id,
      });

      return toSummary(updated);
    },

    async cancel(params: { requestId: string; actorId: string }): Promise<MoneyRequestSummary> {
      const moneyRequestRepo = createMoneyRequestRepository(prisma);
      const request = await moneyRequestRepo.findByIdOrThrow(params.requestId);
      if (request.status !== 'PENDING') {
        throw new InvalidRequestStateError();
      }
      if (request.requesterId !== params.actorId) {
        throw new ForbiddenError('Seul le demandeur peut annuler sa demande');
      }

      const updated = await moneyRequestRepo.updateStatus(request.id, {
        status: 'CANCELLED',
        respondedById: params.actorId,
      });
      return toSummary(updated);
    },

    /// Once resolved (approved/rejected/cancelled), this record is only ever shown to its own
    /// requester (parents and the other sibling only ever see PENDING requests — the UI has no
    /// resolved-history view for them) — so clearing it from the requester's own list is
    /// already "every account that can see it," and it's safe to hard-delete right away.
    async clear(params: { requestId: string; actorId: string; actorFamilyId: string }): Promise<void> {
      const moneyRequestRepo = createMoneyRequestRepository(prisma);
      const request = await moneyRequestRepo.findByIdOrThrow(params.requestId);
      if (request.requester.familyId !== params.actorFamilyId) {
        throw new ForbiddenError();
      }
      if (request.status === 'PENDING') {
        throw new InvalidRequestStateError();
      }
      if (request.requesterId !== params.actorId) {
        throw new ForbiddenError('Seul le demandeur peut supprimer cette demande');
      }

      await moneyRequestRepo.delete(request.id);
    },
  };
}

export type MoneyRequestService = ReturnType<typeof createMoneyRequestService>;
