import type { TransactionSummary } from '@banque-familiale/shared';

export function toTransactionSummary(t: {
  id: string;
  account: { userId: string; user: { firstName: string } };
  type: TransactionSummary['type'];
  status: TransactionSummary['status'];
  amountCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  comment: string | null;
  occurredAt: Date;
  reversedBy: unknown;
  sender: { firstName: string } | null;
  receiver: { firstName: string } | null;
  validatedBy: { firstName: string } | null;
}): TransactionSummary {
  return {
    id: t.id,
    childUserId: t.account.userId,
    childFirstName: t.account.user.firstName,
    type: t.type,
    status: t.status,
    amountCents: t.amountCents,
    balanceBeforeCents: t.balanceBeforeCents,
    balanceAfterCents: t.balanceAfterCents,
    comment: t.comment,
    occurredAt: t.occurredAt.toISOString(),
    isReversible: t.status === 'COMPLETED' && t.reversedBy === null,
    senderFirstName: t.sender?.firstName ?? null,
    receiverFirstName: t.receiver?.firstName ?? null,
    validatedByFirstName: t.validatedBy?.firstName ?? null,
  };
}
