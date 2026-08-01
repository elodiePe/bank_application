DROP TABLE "LaundryCompletion";

ALTER TABLE "LaundryType" DROP COLUMN "rotationCursor";

CREATE TABLE "LaundryNotificationLog" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "laundryTypeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TODAY',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaundryNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaundryNotificationLog_laundryTypeId_date_kind_key" ON "LaundryNotificationLog"("laundryTypeId", "date", "kind");

CREATE INDEX "LaundryNotificationLog_familyId_idx" ON "LaundryNotificationLog"("familyId");

ALTER TABLE "LaundryNotificationLog" ADD CONSTRAINT "LaundryNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
