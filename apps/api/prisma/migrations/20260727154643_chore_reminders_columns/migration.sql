-- AlterTable: reminder dedupe timestamps
ALTER TABLE "Chore" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);
ALTER TABLE "ChoreCompletion" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- AlterTable: link a CHORE_REMINDER notification back to the chore it's about
ALTER TABLE "Notification" ADD COLUMN "relatedChoreId" TEXT;
