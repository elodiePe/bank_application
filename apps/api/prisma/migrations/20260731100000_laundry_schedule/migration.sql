CREATE TYPE "LaundryScheduleType" AS ENUM ('ONCE', 'WEEKLY', 'MULTIPLE');

ALTER TABLE "LaundryType" ADD COLUMN "scheduleType" "LaundryScheduleType" NOT NULL DEFAULT 'WEEKLY';
ALTER TABLE "LaundryType" ADD COLUMN "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "LaundryType" ADD COLUMN "onceDate" TIMESTAMP(3);
