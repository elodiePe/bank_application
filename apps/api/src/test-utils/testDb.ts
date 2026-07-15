import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';

const apiRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

export interface TestDb {
  prisma: PrismaClient;
  teardown(): Promise<void>;
}

function withSchema(url: string, schema: string): string {
  const u = new URL(url);
  u.searchParams.set('schema', schema);
  // Supabase's free tier caps direct (non-pooled) connections low — each test file gets
  // its own PrismaClient, so keep every one of them to a single connection.
  u.searchParams.set('connection_limit', '1');
  return u.toString();
}

/**
 * Pushes the current Prisma schema onto a fresh, isolated Postgres schema (namespace)
 * within the same database, so tests never touch real data. Each call gets its own
 * schema, dropped on teardown. Uses DIRECT_URL (session mode) — DDL and `db push`
 * don't work reliably through the transaction-mode pgbouncer pooler in DATABASE_URL.
 */
export function createTestDb(): TestDb {
  const schema = `test_${randomUUID().replace(/-/g, '')}`;
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) throw new Error('DIRECT_URL must be set to run tests against Postgres');
  const databaseUrl = withSchema(directUrl, schema);

  execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: apiRoot,
    // The schema declares both `url` and `directUrl` — db push resolves DDL through
    // directUrl when present, so both must point at the same scoped schema or the
    // tables end up created in "public" while queries look in the test schema.
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'pipe',
    shell: true,
  });

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

  return {
    prisma,
    async teardown() {
      await prisma.$disconnect();
      const client = new Client({ connectionString: directUrl });
      await client.connect();
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    },
  };
}
