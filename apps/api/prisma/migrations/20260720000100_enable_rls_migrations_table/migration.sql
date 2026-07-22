-- Prisma's own internal migration-tracking table also sits in the public schema and gets
-- flagged by Supabase's public-table scanner, even though it holds no application data.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
