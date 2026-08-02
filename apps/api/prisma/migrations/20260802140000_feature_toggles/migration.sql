-- Feature toggles for Actions/Repas/Courses/Ménage. Existing families get everything on
-- (they're already using these), since ADD COLUMN ... DEFAULT true backfills every current
-- row. The default is then flipped to false so any family created after this migration starts
-- with these sections off until a parent opts in (via onboarding or Paramètres).
ALTER TABLE "Settings" ADD COLUMN "stocksEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "mealPlanEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "shoppingListEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "laundryEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Settings" ALTER COLUMN "stocksEnabled" SET DEFAULT false;
ALTER TABLE "Settings" ALTER COLUMN "mealPlanEnabled" SET DEFAULT false;
ALTER TABLE "Settings" ALTER COLUMN "shoppingListEnabled" SET DEFAULT false;
ALTER TABLE "Settings" ALTER COLUMN "laundryEnabled" SET DEFAULT false;
