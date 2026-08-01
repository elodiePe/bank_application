CREATE TABLE "CustomNotification" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "sendToAll" BOOLEAN NOT NULL DEFAULT true,
    "recipientUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomNotificationLog" (
    "id" TEXT NOT NULL,
    "customNotificationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomNotification_familyId_idx" ON "CustomNotification"("familyId");

CREATE UNIQUE INDEX "CustomNotificationLog_customNotificationId_date_key" ON "CustomNotificationLog"("customNotificationId", "date");

ALTER TABLE "CustomNotification" ADD CONSTRAINT "CustomNotification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomNotificationLog" ADD CONSTRAINT "CustomNotificationLog_customNotificationId_fkey" FOREIGN KEY ("customNotificationId") REFERENCES "CustomNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
