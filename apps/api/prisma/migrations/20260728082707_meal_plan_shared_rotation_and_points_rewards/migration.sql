-- AlterTable: rotation order moves from per-weekday to family-wide
ALTER TABLE "MealPlanSlot" DROP COLUMN "rotationUserIds";

-- CreateTable
CREATE TABLE "MealPlanRotationOrder" (
    "familyId" TEXT NOT NULL,
    "orderedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanRotationOrder_pkey" PRIMARY KEY ("familyId")
);

-- CreateTable
CREATE TABLE "PointsRewardGoal" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pointsRequired" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsRewardGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointsRewardGoal_familyId_idx" ON "PointsRewardGoal"("familyId");
