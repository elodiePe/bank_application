-- Chore: postpone-to-tomorrow support + a distinct dedupe field for the new evening reminder pass
ALTER TABLE "Chore" ADD COLUMN "lastEveningReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Chore" ADD COLUMN "startsOn" TIMESTAMP(3);

-- PersonalTask: self-created, no-reward, auto-validated tasks
CREATE TABLE "PersonalTask" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonalTask_familyId_idx" ON "PersonalTask"("familyId");
CREATE INDEX "PersonalTask_userId_idx" ON "PersonalTask"("userId");

ALTER TABLE "PersonalTask" ADD CONSTRAINT "PersonalTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MealPlanOccurrenceStatus: per-date done/postponed overlay on top of the calendar rotation
CREATE TABLE "MealPlanOccurrenceStatus" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "postponedToDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanOccurrenceStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MealPlanOccurrenceStatus_familyId_date_key" ON "MealPlanOccurrenceStatus"("familyId", "date");
CREATE INDEX "MealPlanOccurrenceStatus_familyId_idx" ON "MealPlanOccurrenceStatus"("familyId");

-- LaundryOccurrenceStatus: same overlay, per (laundryTypeId, date)
CREATE TABLE "LaundryOccurrenceStatus" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "laundryTypeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "postponedToDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaundryOccurrenceStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaundryOccurrenceStatus_laundryTypeId_date_key" ON "LaundryOccurrenceStatus"("laundryTypeId", "date");
CREATE INDEX "LaundryOccurrenceStatus_familyId_idx" ON "LaundryOccurrenceStatus"("familyId");
