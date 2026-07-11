import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createFamilyRepository } from './familyRepository.js';

const apiRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

describe('familyRepository (seeded demo family)', () => {
  let tempDir: string;
  let databaseUrl: string;
  let prisma: PrismaClient;

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'banque-familiale-test-'));
    const dbPath = path.join(tempDir, 'test.db');
    databaseUrl = `file:${dbPath}`;

    // Push the current schema onto a fresh, isolated SQLite file for this test run.
    execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
      shell: true,
    });

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates the demo family with 2 parents, 3 children and default settings', async () => {
    const family = await seedDemoFamily(prisma);
    const repository = createFamilyRepository(prisma);

    const result = await repository.findWithMembers(family.id);

    expect(result).not.toBeNull();
    expect(result?.settings?.defaultInterestRateBps).toBe(240);
    expect(result?.settings?.currency).toBe('CHF');

    const parents = result!.users.filter((u) => u.role === 'PARENT');
    const children = result!.users.filter((u) => u.role === 'CHILD');

    expect(parents.map((p) => p.firstName).sort()).toEqual(['Maman', 'Papa']);
    expect(children.map((c) => c.firstName).sort()).toEqual(['Damien', 'Elodie', 'Matthieu']);

    for (const parent of parents) {
      expect(parent.passwordHash).toBeTruthy();
      expect(parent.childAccount).toBeNull();
    }

    for (const child of children) {
      expect(child.passwordHash).toBeNull();
      expect(child.pinHash).toBeTruthy();
      expect(child.childAccount?.balanceCents).toBe(0);
    }
  });

  it('is idempotent: seeding twice does not duplicate users', async () => {
    const family = await seedDemoFamily(prisma);
    const repository = createFamilyRepository(prisma);

    const result = await repository.findWithMembers(family.id);

    expect(result?.users).toHaveLength(5);
  });
});
