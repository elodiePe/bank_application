import type { PrismaClient } from '@prisma/client';
import type { NotificationSummary } from '@banque-familiale/shared';
import { createNotificationRepository } from '../repositories/notificationRepository.js';
import { createUserRepository } from '../repositories/userRepository.js';
import { createPushService } from './pushService.js';
import { formatChf } from '../utils/currency.js';

// In-app routes a push notification can deep-link to, so tapping it opens the page the
// notification is actually about instead of just the app root.
const ROUTE = {
  accueil: '/home',
  argent: '/dashboard',
  actions: '/dashboard?tab=stocks',
  maison: '/chores',
  courses: '/chores?tab=shopping',
  parametres: '/settings',
} as const;

function toSummary(n: {
  id: string;
  type: NotificationSummary['type'];
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  relatedTransactionId: string | null;
  relatedMoneyRequestId: string | null;
  relatedDisputeId: string | null;
  relatedChoreCompletionId: string | null;
  relatedChoreId: string | null;
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
    relatedDisputeId: n.relatedDisputeId,
    relatedChoreCompletionId: n.relatedChoreCompletionId,
    relatedChoreId: n.relatedChoreId,
  };
}

export function createNotificationService(prisma: PrismaClient) {
  const notificationRepo = createNotificationRepository(prisma);
  const userRepo = createUserRepository(prisma);
  const pushService = createPushService(prisma);

  /** Writes the in-app notification, then best-effort pushes the same content to the device.
   * `url` is push-only (never persisted) — it's what the OS notification deep-links to.
   *
   * The push send is deliberately NOT awaited: it's a real network call to an external push
   * service (FCM/Mozilla) that can take seconds, especially for a stale subscription that has
   * to fail before the caller gives up — awaiting it here would block the HTTP response for
   * every action that notifies someone (creating a request, validating a chore, …) on a
   * best-effort side effect that already handles its own errors internally. The in-app
   * notification row (what actually matters for correctness) is still written and awaited
   * before this returns. */
  async function createAndPush(data: Parameters<typeof notificationRepo.create>[0], url: string) {
    await notificationRepo.create(data);
    void pushService.sendToUser(data.userId, { title: data.title, body: data.body, url }).catch((err) => {
      console.error('[push] background send failed', err);
    });
  }

  async function createManyAndPush(data: Parameters<typeof notificationRepo.createMany>[0], url: string) {
    await notificationRepo.createMany(data);
    void Promise.allSettled(
      data.map((n) => pushService.sendToUser(n.userId, { title: n.title, body: n.body, url })),
    );
  }

  return {
    async listMine(userId: string): Promise<NotificationSummary[]> {
      const notifications = await notificationRepo.listForUser(userId);
      return notifications.map(toSummary);
    },

    deleteOne(id: string, userId: string) {
      return notificationRepo.deleteOne(id, userId);
    },

    deleteAllForUser(userId: string) {
      return notificationRepo.deleteAllForUser(userId);
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
        ROUTE.accueil,
      );
    },

    async notifySiblingOfRequest(params: {
      targetUserId: string;
      requesterFirstName: string;
      amountCents: number;
      moneyRequestId: string;
    }) {
      await createAndPush(
        {
          userId: params.targetUserId,
          type: 'MONEY_REQUEST_CREATED',
          title: `${params.requesterFirstName} te demande de l'argent`,
          body: `${params.requesterFirstName} te demande ${formatChf(params.amountCents)}.`,
          relatedMoneyRequestId: params.moneyRequestId,
        },
        ROUTE.accueil,
      );
    },

    async notifyRequestApproved(params: {
      requesterId: string;
      amountCents: number;
      approvedByFirstName: string;
      moneyRequestId: string;
    }) {
      await createAndPush(
        {
          userId: params.requesterId,
          type: 'MONEY_REQUEST_APPROVED',
          title: 'Ta demande a été acceptée',
          body: `${params.approvedByFirstName} a accepté ta demande de ${formatChf(params.amountCents)}.`,
          relatedMoneyRequestId: params.moneyRequestId,
        },
        ROUTE.accueil,
      );
    },

    async notifyRequestRejected(params: {
      requesterId: string;
      amountCents: number;
      rejectedByFirstName: string;
      moneyRequestId: string;
    }) {
      await createAndPush(
        {
          userId: params.requesterId,
          type: 'MONEY_REQUEST_REJECTED',
          title: 'Ta demande a été refusée',
          body: `${params.rejectedByFirstName} a refusé ta demande de ${formatChf(params.amountCents)}.`,
          relatedMoneyRequestId: params.moneyRequestId,
        },
        ROUTE.accueil,
      );
    },

    async notifyDeposit(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'DEPOSIT_RECEIVED',
          title: 'Dépôt reçu',
          body: `${formatChf(params.amountCents)} ont été ajoutés à ton compte.`,
          relatedTransactionId: params.transactionId,
        },
        ROUTE.argent,
      );
    },

    async notifyWithdrawal(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'WITHDRAWAL_PROCESSED',
          title: 'Retrait effectué',
          body: `${formatChf(params.amountCents)} ont été retirés de ton compte.`,
          relatedTransactionId: params.transactionId,
        },
        ROUTE.argent,
      );
    },

    async notifyTransfer(params: {
      fromUserId: string;
      toUserId: string;
      fromFirstName: string;
      toFirstName: string;
      amountCents: number;
      transactionId: string;
    }) {
      await createManyAndPush(
        [
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
        ],
        ROUTE.argent,
      );
    },

    async notifyCorrection(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'CORRECTION_APPLIED',
          title: 'Correction sur ton compte',
          body: `Une opération a été corrigée sur ton compte (${formatChf(params.amountCents)}).`,
          relatedTransactionId: params.transactionId,
        },
        ROUTE.argent,
      );
    },

    async notifyInterest(params: { userId: string; amountCents: number; transactionId: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'INTEREST_APPLIED',
          title: 'Intérêts versés',
          body: `Tu as gagné ${formatChf(params.amountCents)} d'intérêts ce mois-ci.`,
          relatedTransactionId: params.transactionId,
        },
        ROUTE.argent,
      );
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
        ROUTE.actions,
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
      await createAndPush(
        {
          userId: params.requesterId,
          type: 'STOCK_ORDER_APPROVED',
          title: 'Ton ordre en bourse a été accepté',
          body: `${params.approvedByFirstName} a accepté ton ordre d'${verb} de ${params.quantity} ${params.symbol}.`,
        },
        ROUTE.actions,
      );
    },

    async notifyStockOrderRejected(params: {
      requesterId: string;
      type: 'BUY' | 'SELL';
      symbol: string;
      quantity: number;
      rejectedByFirstName: string;
    }) {
      const verb = params.type === 'BUY' ? 'achat' : 'vente';
      await createAndPush(
        {
          userId: params.requesterId,
          type: 'STOCK_ORDER_REJECTED',
          title: 'Ton ordre en bourse a été refusé',
          body: `${params.rejectedByFirstName} a refusé ton ordre d'${verb} de ${params.quantity} ${params.symbol}.`,
        },
        ROUTE.actions,
      );
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
        ROUTE.parametres,
      );
    },

    async notifyParentsOfDispute(params: {
      familyId: string;
      childFirstName: string;
      amountCents: number;
      disputeId: string;
    }) {
      const members = await userRepo.listFamilyMembers(params.familyId);
      const parents = members.filter((m) => m.role === 'PARENT');
      if (parents.length === 0) return;

      await createManyAndPush(
        parents.map((p) => ({
          userId: p.id,
          type: 'DISPUTE_RAISED',
          title: `${params.childFirstName} a signalé une erreur`,
          body: `${params.childFirstName} pense qu'une opération de ${formatChf(params.amountCents)} est incorrecte.`,
          relatedDisputeId: params.disputeId,
        })),
        ROUTE.accueil,
      );
    },

    async notifyDisputeDismissed(params: { childId: string; dismissedByFirstName: string; disputeId: string }) {
      await createAndPush(
        {
          userId: params.childId,
          type: 'DISPUTE_DISMISSED',
          title: 'Ton signalement a été examiné',
          body: `${params.dismissedByFirstName} a vérifié ton signalement — l'opération reste inchangée.`,
          relatedDisputeId: params.disputeId,
        },
        ROUTE.accueil,
      );
    },

    async notifyParentsOfChoreCompletion(params: {
      familyId: string;
      childFirstName: string;
      choreTitle: string;
      choreCompletionId: string;
    }) {
      const members = await userRepo.listFamilyMembers(params.familyId);
      const parents = members.filter((m) => m.role === 'PARENT');
      if (parents.length === 0) return;

      await createManyAndPush(
        parents.map((p) => ({
          userId: p.id,
          type: 'CHORE_COMPLETED',
          title: `${params.childFirstName} a fait une tâche`,
          body: `${params.childFirstName} dit avoir fini « ${params.choreTitle} ».`,
          relatedChoreCompletionId: params.choreCompletionId,
        })),
        ROUTE.maison,
      );
    },

    async notifyChoreApproved(params: {
      childUserId: string;
      choreTitle: string;
      rewardType: 'MONEY' | 'POINTS' | 'NONE';
      rewardCents: number | null;
      rewardPoints: number | null;
      approvedByFirstName: string;
      choreCompletionId: string;
    }) {
      const body =
        params.rewardType === 'NONE'
          ? `${params.approvedByFirstName} a validé « ${params.choreTitle} ».`
          : `${params.approvedByFirstName} a validé « ${params.choreTitle} » — tu as gagné ${params.rewardType === 'MONEY' ? formatChf(params.rewardCents ?? 0) : `${params.rewardPoints ?? 0} points`}.`;
      await createAndPush(
        {
          userId: params.childUserId,
          type: 'CHORE_APPROVED',
          title: 'Tâche validée !',
          body,
          relatedChoreCompletionId: params.choreCompletionId,
        },
        ROUTE.accueil,
      );
    },

    async notifyChoreRejected(params: {
      childUserId: string;
      choreTitle: string;
      rejectedByFirstName: string;
      choreCompletionId: string;
    }) {
      await createAndPush(
        {
          userId: params.childUserId,
          type: 'CHORE_REJECTED',
          title: 'Tâche refusée',
          body: `${params.rejectedByFirstName} n'a pas validé « ${params.choreTitle} ». Tu peux réessayer.`,
          relatedChoreCompletionId: params.choreCompletionId,
        },
        ROUTE.accueil,
      );
    },

    async notifyChoreReminder(params: { childUserId: string; choreTitle: string; choreId: string }) {
      await createAndPush(
        {
          userId: params.childUserId,
          type: 'CHORE_REMINDER',
          title: 'Tâche à faire',
          body: `N'oublie pas : « ${params.choreTitle} » n'est pas encore fait.`,
          relatedChoreId: params.choreId,
        },
        ROUTE.maison,
      );
    },

    /** Distinct evening pass (not the hourly threshold-based one above) — mentions that the
     * chore can be postponed to tomorrow instead of just repeating "not done yet". */
    async notifyChoreEveningReminder(params: { childUserId: string; choreTitle: string; choreId: string }) {
      await createAndPush(
        {
          userId: params.childUserId,
          type: 'CHORE_REMINDER',
          title: 'Tâche pas encore faite',
          body: `« ${params.choreTitle} » n'est pas encore fait — tu peux la faire maintenant ou la reporter à demain.`,
          relatedChoreId: params.choreId,
        },
        ROUTE.maison,
      );
    },

    async notifyParentsOfChoreAwaitingApproval(params: {
      familyId: string;
      childFirstName: string;
      choreTitle: string;
      choreCompletionId: string;
    }) {
      const members = await userRepo.listFamilyMembers(params.familyId);
      const parents = members.filter((m) => m.role === 'PARENT');
      if (parents.length === 0) return;

      await createManyAndPush(
        parents.map((p) => ({
          userId: p.id,
          type: 'CHORE_REMINDER',
          title: 'Tâche en attente de validation',
          body: `« ${params.choreTitle} » de ${params.childFirstName} attend toujours ta validation.`,
          relatedChoreCompletionId: params.choreCompletionId,
        })),
        ROUTE.maison,
      );
    },

    async notifyMealPlanTurn(params: { userId: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'MEAL_PLAN_TURN',
          title: "C'est ton tour de cuisiner !",
          body: "N'oublie pas : c'est toi qui prépares le repas du soir aujourd'hui.",
        },
        ROUTE.maison,
      );
    },

    /** Advance notice, sent the evening before — same MEAL_PLAN_TURN type as the same-day
     * reminder, since both point at the same "who's cooking" screen. */
    async notifyMealPlanTurnTomorrow(params: { userId: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'MEAL_PLAN_TURN',
          title: 'Demain, c\'est toi qui cuisines !',
          body: "Pense à prévoir le repas du soir de demain, c'est ton tour.",
        },
        ROUTE.maison,
      );
    },

    async notifyLaundryTurn(params: { userId: string; laundryTypeName: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'LAUNDRY_TURN',
          title: "C'est ton tour pour la lessive !",
          body: `N'oublie pas : « ${params.laundryTypeName} » est à faire aujourd'hui.`,
        },
        ROUTE.maison,
      );
    },

    /** Advance notice, sent the evening before — same LAUNDRY_TURN type as the same-day
     * reminder, since both point at the same laundry screen. */
    async notifyLaundryTurnTomorrow(params: { userId: string; laundryTypeName: string }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'LAUNDRY_TURN',
          title: 'Demain, à toi la lessive !',
          body: `Pense à « ${params.laundryTypeName} », c'est ton tour demain.`,
        },
        ROUTE.maison,
      );
    },

    /** A parent-authored reminder (see customNotificationService) — arbitrary title/body, so
     * it's stored as GENERIC rather than getting its own type. */
    async notifyCustom(params: { userId: string; title: string; body: string }) {
      await createAndPush(
        { userId: params.userId, type: 'GENERIC', title: params.title, body: params.body },
        ROUTE.accueil,
      );
    },

    /** Broadcast to everyone else in the family — no dedicated type, just GENERIC — announcing
     * that the requester is about to go shopping, so it's the last chance to add something to
     * the list. */
    async notifyShoppingTrip(params: { familyId: string; requesterId: string }) {
      const members = await userRepo.listFamilyMembers(params.familyId);
      const requester = members.find((m) => m.id === params.requesterId);
      const others = members.filter((m) => m.id !== params.requesterId);
      if (!requester || others.length === 0) return;

      await createManyAndPush(
        others.map((m) => ({
          userId: m.id,
          type: 'GENERIC',
          title: `${requester.firstName} va faire les courses`,
          body: "C'est maintenant ou jamais pour ajouter quelque chose à la liste !",
        })),
        ROUTE.courses,
      );
    },

    async notifyStockGiftReceived(params: {
      userId: string;
      symbol: string;
      quantity: number;
      givenByFirstName: string;
      transactionId: string;
    }) {
      await createAndPush(
        {
          userId: params.userId,
          type: 'STOCK_GIFT_RECEIVED',
          title: 'Tu as reçu des actions en cadeau',
          body: `${params.givenByFirstName} t'a offert ${params.quantity} ${params.symbol}.`,
          relatedTransactionId: params.transactionId,
        },
        ROUTE.actions,
      );
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
