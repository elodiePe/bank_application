import type { PrismaClient, Dispute, Transaction, User } from '@prisma/client';
import type { DisputeSummary } from '@banque-familiale/shared';
import { createDisputeRepository } from '../repositories/disputeRepository.js';
import { createTransactionRepository } from '../repositories/transactionRepository.js';
import { createChildAccountRepository } from '../repositories/childAccountRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createNotificationService } from './notificationService.js';
import { ConflictError, ForbiddenError, InvalidRequestStateError, ValidationError } from '../utils/errors.js';

type DisputeWithRelations = Dispute & {
  raisedBy: User;
  resolvedBy: User | null;
};

function toSummary(d: DisputeWithRelations, transaction: Transaction): DisputeSummary {
  return {
    id: d.id,
    transactionId: d.transactionId,
    raisedById: d.raisedById,
    raisedByFirstName: d.raisedBy.firstName,
    reason: d.reason,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    resolvedByFirstName: d.resolvedBy?.firstName ?? null,
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    transactionType: transaction.type,
    transactionAmountCents: transaction.amountCents,
    transactionOccurredAt: transaction.occurredAt.toISOString(),
  };
}

export function createDisputeService(prisma: PrismaClient) {
  const notificationService = createNotificationService(prisma);
  const userRepo = createUserRepository(prisma);

  /** Disputes are only loosely linked to Transaction (by id, like Notification), so their
   * snapshot fields are batch-fetched here rather than via a Prisma include. */
  async function withTransactions(disputes: DisputeWithRelations[]): Promise<DisputeSummary[]> {
    if (disputes.length === 0) return [];
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: disputes.map((d) => d.transactionId) } },
    });
    const byId = new Map(transactions.map((t) => [t.id, t]));
    return disputes
      .filter((d) => byId.has(d.transactionId))
      .map((d) => toSummary(d, byId.get(d.transactionId)!));
  }

  return {
    async raise(params: {
      transactionId: string;
      raisedById: string;
      familyId: string;
      reason: string;
    }): Promise<DisputeSummary> {
      if (!params.reason.trim()) {
        throw new ValidationError('Explique ce qui te semble incorrect');
      }

      const transactionRepo = createTransactionRepository(prisma);
      const childAccountRepo = createChildAccountRepository(prisma);
      const disputeRepo = createDisputeRepository(prisma);

      const transaction = await transactionRepo.findByIdOrThrow(params.transactionId);
      const account = await childAccountRepo.findByIdOrThrow(transaction.accountId);

      if (account.user.id !== params.raisedById || account.user.familyId !== params.familyId) {
        throw new ForbiddenError('Tu ne peux signaler que tes propres opérations');
      }
      if (transaction.status !== 'COMPLETED') {
        throw new InvalidRequestStateError('Cette opération ne peut pas être signalée');
      }

      const existing = await disputeRepo.findOpenForTransaction(transaction.id);
      if (existing) {
        throw new ConflictError('Une signalisation est déjà en cours pour cette opération');
      }

      const created = await disputeRepo.create({
        transactionId: transaction.id,
        raisedBy: { connect: { id: params.raisedById } },
        reason: params.reason.trim(),
      });

      await notificationService.notifyParentsOfDispute({
        familyId: params.familyId,
        childFirstName: created.raisedBy.firstName,
        amountCents: transaction.amountCents,
        disputeId: created.id,
      });

      return toSummary(created, transaction);
    },

    async listMine(userId: string): Promise<DisputeSummary[]> {
      const disputeRepo = createDisputeRepository(prisma);
      const disputes = await disputeRepo.listForUser(userId);
      return withTransactions(disputes);
    },

    async listPendingForFamily(familyId: string): Promise<DisputeSummary[]> {
      const disputeRepo = createDisputeRepository(prisma);
      const disputes = await disputeRepo.listPendingForFamily(familyId);
      return withTransactions(disputes);
    },

    async dismiss(params: { disputeId: string; actorId: string; actorFamilyId: string }): Promise<DisputeSummary> {
      const disputeRepo = createDisputeRepository(prisma);
      const dispute = await disputeRepo.findByIdOrThrow(params.disputeId);
      if (dispute.status !== 'PENDING') {
        throw new InvalidRequestStateError();
      }
      if (dispute.raisedBy.familyId !== params.actorFamilyId) {
        throw new ForbiddenError();
      }

      const updated = await disputeRepo.updateStatus(dispute.id, {
        status: 'DISMISSED',
        resolvedById: params.actorId,
      });

      const actor = await userRepo.findById(params.actorId);
      await notificationService.notifyDisputeDismissed({
        childId: dispute.raisedById,
        dismissedByFirstName: actor?.firstName ?? '',
        disputeId: dispute.id,
      });

      const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: updated.transactionId } });
      return toSummary(updated, transaction);
    },

    /** Called after a parent corrects the disputed transaction, to auto-close the dispute. */
    async resolve(params: { disputeId: string; actorId: string; actorFamilyId: string }): Promise<DisputeSummary> {
      const disputeRepo = createDisputeRepository(prisma);
      const dispute = await disputeRepo.findByIdOrThrow(params.disputeId);
      if (dispute.status !== 'PENDING') {
        throw new InvalidRequestStateError();
      }
      if (dispute.raisedBy.familyId !== params.actorFamilyId) {
        throw new ForbiddenError();
      }

      const updated = await disputeRepo.updateStatus(dispute.id, {
        status: 'RESOLVED',
        resolvedById: params.actorId,
      });

      const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: updated.transactionId } });
      return toSummary(updated, transaction);
    },
  };
}

export type DisputeService = ReturnType<typeof createDisputeService>;
