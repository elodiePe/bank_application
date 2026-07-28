-- AlterTable: reward goals become per-child instead of family-wide.
ALTER TABLE "PointsRewardGoal" ADD COLUMN "childUserId" TEXT;

-- Any reward defined under the old family-wide design has no correct child to backfill to —
-- the feature is being replaced by a per-child ladder, so these are dropped rather than left
-- as unreachable orphans.
DELETE FROM "PointsRewardGoal" WHERE "childUserId" IS NULL;

ALTER TABLE "PointsRewardGoal" ALTER COLUMN "childUserId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "PointsRewardGoal_childUserId_idx" ON "PointsRewardGoal"("childUserId");
