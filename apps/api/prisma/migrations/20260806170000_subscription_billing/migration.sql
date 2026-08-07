-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('ESSENTIEL', 'FAMILLE', 'GRANDE_FAMILLE');

-- AlterTable
ALTER TABLE "Family"
  ADD COLUMN "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'ESSENTIEL',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripeSubscriptionStatus" TEXT,
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "stripeCurrentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Family_stripeCustomerId_key" ON "Family"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Family_stripeSubscriptionId_key" ON "Family"("stripeSubscriptionId");
