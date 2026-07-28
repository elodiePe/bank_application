-- DropForeignKey
ALTER TABLE "MealPlanSlot" DROP CONSTRAINT "MealPlanSlot_assignedUserId_fkey";

-- AlterTable
ALTER TABLE "MealPlanSlot"
  DROP COLUMN "assignedUserId",
  ADD COLUMN "mode" "MealPlanDayMode" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "fixedUserId" TEXT,
  ADD COLUMN "rotationUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "MealPlanSlot" ADD CONSTRAINT "MealPlanSlot_fixedUserId_fkey" FOREIGN KEY ("fixedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MealCookNotificationLog" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealCookNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealCookNotificationLog_familyId_idx" ON "MealCookNotificationLog"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "MealCookNotificationLog_familyId_date_key" ON "MealCookNotificationLog"("familyId", "date");

-- AddForeignKey
ALTER TABLE "MealCookNotificationLog" ADD CONSTRAINT "MealCookNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
