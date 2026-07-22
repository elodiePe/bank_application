-- Enable Row-Level Security on every table exposed via Supabase's public PostgREST API.
-- This app's own backend connects directly as the table owner (via DATABASE_URL/DIRECT_URL),
-- which bypasses RLS by default, so this only closes the separate public REST/GraphQL API
-- pathway that Supabase provisions automatically — it does not affect the app itself.
-- No policies are defined on purpose: the anon/authenticated Supabase roles should have zero
-- access to this data, since all access is meant to go through the Express API's own auth.

ALTER TABLE "Family" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChildAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MoneyRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InterestHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AllowanceHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockHolding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshSession" ENABLE ROW LEVEL SECURITY;
