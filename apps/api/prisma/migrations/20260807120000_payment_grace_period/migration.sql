-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_PAST_DUE';

-- AlterTable
ALTER TABLE "Family"
  ADD COLUMN "paymentGracePeriodStartedAt" TIMESTAMP(3),
  ADD COLUMN "paymentGraceReminderSentAt" TIMESTAMP(3);
