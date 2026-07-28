-- CreateEnum
CREATE TYPE "ChoreRewardType" AS ENUM ('MONEY', 'POINTS');

-- AlterTable: ChildAccount gains a cosmetic points score
ALTER TABLE "ChildAccount" ADD COLUMN "pointsBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Chore reward becomes money-or-points
ALTER TABLE "Chore" ADD COLUMN "rewardType" "ChoreRewardType" NOT NULL DEFAULT 'MONEY';
ALTER TABLE "Chore" ADD COLUMN "rewardPoints" INTEGER;
ALTER TABLE "Chore" ALTER COLUMN "rewardCents" DROP NOT NULL;

-- AlterTable: ChoreCompletion reward snapshot becomes money-or-points
ALTER TABLE "ChoreCompletion" ADD COLUMN "rewardType" "ChoreRewardType" NOT NULL DEFAULT 'MONEY';
ALTER TABLE "ChoreCompletion" ADD COLUMN "rewardPoints" INTEGER;
ALTER TABLE "ChoreCompletion" ALTER COLUMN "rewardCents" DROP NOT NULL;
ALTER TABLE "ChoreCompletion" ALTER COLUMN "rewardType" DROP DEFAULT;
