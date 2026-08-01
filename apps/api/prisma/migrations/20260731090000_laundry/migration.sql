CREATE TABLE "LaundryType" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "mode" "MealPlanDayMode" NOT NULL DEFAULT 'FIXED',
    "fixedUserId" TEXT,
    "rotationOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rotationCursor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaundryType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaundryCompletion" (
    "id" TEXT NOT NULL,
    "laundryTypeId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaundryCompletion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LaundryType_familyId_idx" ON "LaundryType"("familyId");

CREATE INDEX "LaundryCompletion_familyId_idx" ON "LaundryCompletion"("familyId");

CREATE INDEX "LaundryCompletion_laundryTypeId_idx" ON "LaundryCompletion"("laundryTypeId");

ALTER TABLE "LaundryType" ADD CONSTRAINT "LaundryType_fixedUserId_fkey" FOREIGN KEY ("fixedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LaundryCompletion" ADD CONSTRAINT "LaundryCompletion_laundryTypeId_fkey" FOREIGN KEY ("laundryTypeId") REFERENCES "LaundryType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LaundryCompletion" ADD CONSTRAINT "LaundryCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
