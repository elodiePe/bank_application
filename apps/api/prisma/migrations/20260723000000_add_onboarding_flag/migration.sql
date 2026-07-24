-- AlterTable
ALTER TABLE "Family" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Existing families predate the onboarding wizard — treat them as already onboarded
-- (using their creation date) so they are never funneled into it.
UPDATE "Family" SET "onboardingCompletedAt" = "createdAt" WHERE "onboardingCompletedAt" IS NULL;
