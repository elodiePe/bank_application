import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const apiRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

export interface TestDb {
  prisma: PrismaClient;
  teardown(): Promise<void>;
}

/**
 * Pushes the current Prisma schema onto a fresh, isolated SQLite file so tests never
 * touch the developer's `dev.db`. Each call gets its own temp directory.
 */
export function createTestDb(): TestDb {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'banque-familiale-test-'));
  const databaseUrl = `file:${path.join(tempDir, 'test.db')}`;

  execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
    shell: true,
  });

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

  return {
    prisma,
    async teardown() {
      await prisma.$disconnect();
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
  };
}
