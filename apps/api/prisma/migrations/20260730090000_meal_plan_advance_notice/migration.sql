-- AlterTable: split the dedupe log by notification kind (TODAY vs the evening-before ADVANCE
-- notice), since both can legitimately target the same date.
ALTER TABLE "MealCookNotificationLog" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'TODAY';

DROP INDEX "MealCookNotificationLog_familyId_date_key";

CREATE UNIQUE INDEX "MealCookNotificationLog_familyId_date_kind_key" ON "MealCookNotificationLog"("familyId", "date", "kind");
