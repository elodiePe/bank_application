ALTER TABLE "User"
  ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canManageMoney" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canManageActions" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canManageSettings" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "canManageFamily" BOOLEAN NOT NULL DEFAULT true;

-- Grandfather in existing parents: the earliest-created parent per family becomes the
-- fixed admin, matching the "first parent = admin" rule going forward. Every existing
-- parent keeps full permission booleans (already the default above), so nobody already
-- using the app loses any capability retroactively.
WITH first_parent AS (
  SELECT DISTINCT ON ("familyId") id
  FROM "User"
  WHERE "role" = 'PARENT'
  ORDER BY "familyId", "createdAt" ASC
)
UPDATE "User"
SET "isAdmin" = true
WHERE "id" IN (SELECT id FROM first_parent);
