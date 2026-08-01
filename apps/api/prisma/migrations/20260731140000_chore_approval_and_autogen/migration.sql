ALTER TABLE "CustomNotification" ADD COLUMN "time" TEXT NOT NULL DEFAULT '08:00';

ALTER TABLE "Chore" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "LaundryType" ADD COLUMN "generatesChore" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LaundryType" ADD COLUMN "choreRequiresApproval" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LaundryType" ADD COLUMN "choreRewardType" "ChoreRewardType";
ALTER TABLE "LaundryType" ADD COLUMN "choreRewardCents" INTEGER;
ALTER TABLE "LaundryType" ADD COLUMN "choreRewardPoints" INTEGER;

CREATE TABLE "MealPlanChoreConfig" (
    "familyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "rewardType" "ChoreRewardType" NOT NULL DEFAULT 'POINTS',
    "rewardCents" INTEGER,
    "rewardPoints" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanChoreConfig_pkey" PRIMARY KEY ("familyId")
);
