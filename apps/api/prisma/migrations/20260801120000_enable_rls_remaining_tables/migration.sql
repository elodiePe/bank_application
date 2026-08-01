-- Enable Row-Level Security on the tables added since the original 20260720000000_enable_rls
-- migration, which never got it (surfaced by Supabase's Security Advisor as
-- "RLS Disabled in Public"). Same reasoning as that migration: this app's backend connects
-- directly as the table owner (via DATABASE_URL/DIRECT_URL), bypassing RLS by default, so
-- this only closes the separate public REST/GraphQL API pathway Supabase provisions
-- automatically. No policies defined on purpose — anon/authenticated Supabase roles should
-- have zero access, since all access goes through the Express API's own auth.

ALTER TABLE "Chore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PersonalTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavingsGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChoreCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PointsRewardGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealPlanSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealPlanRotationOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealPlanChoreConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealPlanOccurrenceStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealCookNotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LaundryType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LaundryOccurrenceStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LaundryNotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomNotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShoppingListItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dispute" ENABLE ROW LEVEL SECURITY;
