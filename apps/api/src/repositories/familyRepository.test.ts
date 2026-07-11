import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemoFamily } from '../../prisma/seed.js';
import { createTestDb, type TestDb } from '../test-utils/testDb.js';
import { createFamilyRepository } from './familyRepository.js';

describe('familyRepository (seeded demo family)', () => {
  let db: TestDb;

  beforeAll(() => {
    db = createTestDb();
  });

  afterAll(() => db.teardown());

  it('creates the demo family with 2 parents, 3 children and default settings', async () => {
    const family = await seedDemoFamily(db.prisma);
    const repository = createFamilyRepository(db.prisma);

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
    const family = await seedDemoFamily(db.prisma);
    const repository = createFamilyRepository(db.prisma);

    const result = await repository.findWithMembers(family.id);

    expect(result?.users).toHaveLength(5);
  });
});
