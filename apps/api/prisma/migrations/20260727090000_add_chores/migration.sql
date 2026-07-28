-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'CHORE_REWARD';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHORE_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'CHORE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CHORE_REJECTED';

-- CreateEnum
CREATE TYPE "ChoreRecurrence" AS ENUM ('ONCE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "ChoreCompletionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "relatedChoreCompletionId" TEXT;

-- CreateTable
CREATE TABLE "Chore" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rewardCents" INTEGER NOT NULL,
    "recurrence" "ChoreRecurrence" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreCompletion" (
    "id" TEXT NOT NULL,
    "choreId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "status" "ChoreCompletionStatus" NOT NULL DEFAULT 'PENDING',
    "rewardCents" INTEGER NOT NULL,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chore_familyId_idx" ON "Chore"("familyId");

-- CreateIndex
CREATE INDEX "Chore_childUserId_idx" ON "Chore"("childUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreCompletion_transactionId_key" ON "ChoreCompletion"("transactionId");

-- CreateIndex
CREATE INDEX "ChoreCompletion_choreId_idx" ON "ChoreCompletion"("choreId");

-- CreateIndex
CREATE INDEX "ChoreCompletion_status_idx" ON "ChoreCompletion"("status");

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_childUserId_fkey" FOREIGN KEY ("childUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreCompletion" ADD CONSTRAINT "ChoreCompletion_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreCompletion" ADD CONSTRAINT "ChoreCompletion_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
