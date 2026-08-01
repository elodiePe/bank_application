-- MealPlanSlot: fixedUserId (scalar) -> fixedUserIds (array), several people can share a turn
ALTER TABLE "MealPlanSlot" ADD COLUMN "fixedUserIds" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "MealPlanSlot" SET "fixedUserIds" = ARRAY["fixedUserId"] WHERE "fixedUserId" IS NOT NULL;
ALTER TABLE "MealPlanSlot" DROP CONSTRAINT "MealPlanSlot_fixedUserId_fkey";
ALTER TABLE "MealPlanSlot" DROP COLUMN "fixedUserId";

-- MealPlanRotationOrder: orderedUserIds (flat array) -> orderedGroups (JSON array of arrays),
-- each existing entry becomes its own single-person turn.
ALTER TABLE "MealPlanRotationOrder" ADD COLUMN "orderedGroups" JSONB NOT NULL DEFAULT '[]';
UPDATE "MealPlanRotationOrder"
SET "orderedGroups" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_array(u)) FROM unnest("orderedUserIds") AS u),
  '[]'::jsonb
);
ALTER TABLE "MealPlanRotationOrder" DROP COLUMN "orderedUserIds";

-- LaundryType: same two changes as above, scoped per type instead of family-wide.
ALTER TABLE "LaundryType" ADD COLUMN "fixedUserIds" TEXT[] NOT NULL DEFAULT '{}';
UPDATE "LaundryType" SET "fixedUserIds" = ARRAY["fixedUserId"] WHERE "fixedUserId" IS NOT NULL;
ALTER TABLE "LaundryType" DROP CONSTRAINT "LaundryType_fixedUserId_fkey";
ALTER TABLE "LaundryType" DROP COLUMN "fixedUserId";

ALTER TABLE "LaundryType" ADD COLUMN "rotationGroups" JSONB NOT NULL DEFAULT '[]';
UPDATE "LaundryType"
SET "rotationGroups" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_array(u)) FROM unnest("rotationOrder") AS u),
  '[]'::jsonb
);
ALTER TABLE "LaundryType" DROP COLUMN "rotationOrder";
