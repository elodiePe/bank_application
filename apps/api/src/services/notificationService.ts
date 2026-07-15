import type { PrismaClient } from '@prisma/client';
import type { NotificationSummary } from '@banque-familiale/shared';
import { createNotificationRepository } from '../repositories/notificationRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createPushService } from './pushService.js';
import { formatChf } from '../utils/currency.js';

function toSummary(n: {
  id: string;
  type: NotificationSummary['type'];
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  relatedTransactionId: string | null;
  relatedMoneyRequestId: string | null;
}): NotificationSummary {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    relatedTransactionId: n.relatedTransactionId,
    relatedMoneyRequestId: n.relatedMoneyRequestId,
  };
}

export function createNotificationService(prisma: PrismaClient) {
  const notificationRepo = createNotificationRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const pushService = createPushService(prisma);

  /** Writes the in-app notification, then best-effort pushes the same content to the device. */
  async function createAndPush(data: Parameters<typeof notificationRepo.create>[0]) {
    await notificationRepo.create(data);
    await pushService.sendToUser(data.userId, { title: data.title, body: data.body });
  }

  async function createManyAndPush(data: Parameters<typeof notificationRepo.createMany>[0]) {
    await notificationRepo.createMany(data);
    await Promise.allSettled(
      data.map((n) => pushService.sendToUser(n.userId, { title: n.title, body: n.body })),
    );
  }

  return {
    async listMine(userId: string): Promise<NotificationSummary[]> {
      const notifications = await notificationRepo.listForUser(userId);
      return notifications.map(toSummary);
    },

    countUnread(userId: string) {
      return notificationRepo.countUnread(userId);
    },

    markAsRead(id: string, userId: string) {
      return notificationRepo.markAsRead(id, userId);
    },

    markAllAsRead(userId: string) {
      return notificationRepo.markAllAsRead(userId);
    },

    async notifyParentsOfRequest(params: {
      familyId: string;
      requesterFirstName: string;
      amountCents: number;
      moneyRequestId: string;
      isWithdrawal: boolean;
    }) {
      const members = await userRepo.listFamilyMembers(params.familyId);
      const parents = members.filter((m) => m.role === 'PARENT');
      if (parents.length === 0) return;

      await createManyAndPush(
        parents.map((p) => ({
          userId: p.id,
          type: 'MONEY_REQUEST_CREATED',
          title: `${params.requesterFirstName} fait une demande`,
          body: `${params.requesterFirstName} demande un ${params.isWithdrawal ? 'retrait' : 'dépôt'} de ${formatChf(params.amountCents)}.`,
          relatedMoneyRequestId: params.moneyRequestId,
        })),
      );
    },

    async notifySiblingOfRequest(params: {
      targetUserId: string;
      requesterFirstName: string;
      amountCents: number;
      moneyRequestId: string;
    }) {
      await createAndPush({
        userId: params.targetUserId,
        type: 'MONEY_REQUEST_CREATED',
        title: `${params.requesterFirstName} te demande de l'argent`,
        body: `${params.requesterFirstName} te demande ${formatChf(params.amountCents)}.`,
        relatedMoneyRequestId: params.moneyRequestId,
      });
    },

    async notifyRequestApproved(params: {
      requesterId: string;
      amountCents: number;
      approvedByFirstName: string;
      moneyRequestId: string;
    }) {
      await createAndPush({
        userId: params.requesterId,
        type: 'MONEY_REQUEST_APPROVED',
        title: 'Ta demande a été acceptée',
        body: `${params.approvedByFirstName} a accepté ta demande de ${formatChf(params.amountCents)}.`,
        relatedMoneyRequestId: params.moneyRequestId,
      });
    },

    async notifyRequestRejected(params: {
      requesterId: string;
      amountCents: number;
      rejectedByFirstName: string;
      moneyRequestId: string;
    }) {
      await createAndPush({
        userId: params.requesterId,
        type: 'MONEY_REQUEST_REJECTED',
        title: 'Ta demande a été refusée',
        body: `${params.rejectedByFirstName} a refusé ta demande de ${formatChf(params.amountCents)}.`,
        relatedMoneyRequestId: params.moneyRequestId,
      });
    },

    async notifyDeposit(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush({
        userId: params.userId,
        type: 'DEPOSIT_RECEIVED',
        title: 'Dépôt reçu',
        body: `${formatChf(params.amountCents)} ont été ajoutés à ton compte.`,
        relatedTransactionId: params.transactionId,
      });
    },

    async notifyWithdrawal(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush({
        userId: params.userId,
        type: 'WITHDRAWAL_PROCESSED',
        title: 'Retrait effectué',
        body: `${formatChf(params.amountCents)} ont été retirés de ton compte.`,
        relatedTransactionId: params.transactionId,
      });
    },

    async notifyTransfer(params: {
      fromUserId: string;
      toUserId: string;
      fromFirstName: string;
      toFirstName: string;
      amountCents: number;
      transactionId: string;
    }) {
      await createManyAndPush([
        {
          userId: params.fromUserId,
          type: 'TRANSFER_RECEIVED',
          title: 'Virement envoyé',
          body: `Tu as envoyé ${formatChf(params.amountCents)} à ${params.toFirstName}.`,
          relatedTransactionId: params.transactionId,
        },
        {
          userId: params.toUserId,
          type: 'TRANSFER_RECEIVED',
          title: 'Virement reçu',
          body: `Tu as reçu ${formatChf(params.amountCents)} de ${params.fromFirstName}.`,
          relatedTransactionId: params.transactionId,
        },
      ]);
    },

    async notifyCorrection(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush({
        userId: params.userId,
        type: 'CORRECTION_APPLIED',
        title: 'Correction sur ton compte',
        body: `Une opération a été corrigée sur ton compte (${formatChf(params.amountCents)}).`,
        relatedTransactionId: params.transactionId,
      });
    },

    async notifyInterest(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush({
        userId: params.userId,
        type: 'INTEREST_APPLIED',
        title: 'Intérêts versés',
        body: `Tu as gagné ${formatChf(params.amountCents)} d'intérêts ce mois-ci.`,
        relatedTransactionId: params.transactionId,
      });
    },

    async notifyParentsOfStockOrder(params: {
      familyId: string;
      requesterFirstName: string;
      type: 'BUY' | 'SELL';
      symbol: string;
      quantity: number;
    }) {
      const members = await userRepo.listFamilyMembers(params.familyId);
      const parents = members.filter((m) => m.role === 'PARENT');
      if (parents.length === 0) return;

      const verb = params.type === 'BUY' ? 'acheter' : 'vendre';
      await createManyAndPush(
        parents.map((p) => ({
          userId: p.id,
          type: 'STOCK_ORDER_CREATED',
          title: `${params.requesterFirstName} propose un ordre en bourse`,
          body: `${params.requesterFirstName} veut ${verb} ${params.quantity} ${params.symbol}.`,
        })),
      );
    },

    async notifyStockOrderApproved(params: {
      requesterId: string;
      type: 'BUY' | 'SELL';
      symbol: string;
      quantity: number;
      approvedByFirstName: string;
    }) {
      const verb = params.type === 'BUY' ? 'achat' : 'vente';
      await createAndPush({
        userId: params.requesterId,
        type: 'STOCK_ORDER_APPROVED',
        title: 'Ton ordre en bourse a été accepté',
        body: `${params.approvedByFirstName} a accepté ton ordre d'${verb} de ${params.quantity} ${params.symbol}.`,
      });
    },

    async notifyStockOrderRejected(params: {
      requesterId: string;
      type: 'BUY' | 'SELL';
      symbol: string;
      quantity: number;
      rejectedByFirstName: string;
    }) {
      const verb = params.type === 'BUY' ? 'achat' : 'vente';
      await createAndPush({
        userId: params.requesterId,
        type: 'STOCK_ORDER_REJECTED',
        title: 'Ton ordre en bourse a été refusé',
        body: `${params.rejectedByFirstName} a refusé ton ordre d'${verb} de ${params.quantity} ${params.symbol}.`,
      });
    },

    async notifyParentsOfCredentialResetRequest(params: { familyId: string; requesterFirstName: string }) {
      const members = await userRepo.listFamilyMembers(params.familyId);
      const parents = members.filter((m) => m.role === 'PARENT');
      if (parents.length === 0) return;

      await createManyAndPush(
        parents.map((p) => ({
          userId: p.id,
          type: 'CREDENTIAL_RESET_REQUESTED',
          title: `${params.requesterFirstName} a oublié son code`,
          body: `${params.requesterFirstName} a besoin d'un nouveau code PIN. Réinitialise-le depuis « Gestion de la famille ».`,
        })),
      );
    },

    async notifyStockGiftReceived(params: {
      userId: string;
      symbol: string;
      quantity: number;
      givenByFirstName: string;
      transactionId: string;
    }) {
      await createAndPush({
        userId: params.userId,
        type: 'STOCK_GIFT_RECEIVED',
        title: 'Tu as reçu des actions en cadeau',
        body: `${params.givenByFirstName} t'a offert ${params.quantity} ${params.symbol}.`,
        relatedTransactionId: params.transactionId,
      });
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
