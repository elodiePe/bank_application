import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Fall back to fixed dev values so test suites (which don't set these env vars) keep working.
const FAMILY_OWNER_EMAIL = process.env.FAMILY_OWNER_EMAIL ?? 'owner@banque-familiale.local';
const FAMILY_OWNER_PASSWORD = process.env.FAMILY_OWNER_PASSWORD ?? 'demo-owner-password';

/**
 * Demo credentials — for local development only, never used in a real deployment.
 * Parents log in with a password only (no PIN); children log in with a 4-digit PIN only.
 */
const DEMO_PARENTS = [
  { firstName: 'Papa', password: 'papa1234', email: 'papa@banque-familiale.local' },
  { firstName: 'Maman', password: 'maman1234', email: 'maman@banque-familiale.local' },
];

const DEMO_CHILDREN = [
  { firstName: 'Elodie', pin: '3333' },
  { firstName: 'Matthieu', pin: '4444' },
  { firstName: 'Damien', pin: '5555' },
];

/**
 * Creates the demo family (idempotent: safe to run multiple times, re-uses the
 * family if one named "Famille Démo" already exists).
 */
export async function seedDemoFamily(prisma: PrismaClient) {
  // bcrypt at SALT_ROUNDS=12 is deliberately slow; hashing all demo credentials
  // concurrently instead of one-by-one keeps seeding (and the tests that call this
  // on every run) fast without weakening the hash cost itself.
  const [ownerPasswordHash, parentHashes, childHashes] = await Promise.all([
    bcrypt.hash(FAMILY_OWNER_PASSWORD, SALT_ROUNDS),
    Promise.all(
      DEMO_PARENTS.map(async (parent) => ({
        firstName: parent.firstName,
        email: parent.email,
        passwordHash: await bcrypt.hash(parent.password, SALT_ROUNDS),
      })),
    ),
    Promise.all(
      DEMO_CHILDREN.map(async (child) => ({
        firstName: child.firstName,
        pinHash: await bcrypt.hash(child.pin, SALT_ROUNDS),
      })),
    ),
  ]);

  const family = await prisma.family.upsert({
    where: { id: 'demo-family' },
    // Re-running the seed also rotates the owner password if FAMILY_OWNER_PASSWORD changed.
    update: { ownerEmail: FAMILY_OWNER_EMAIL, ownerPasswordHash },
    create: {
      id: 'demo-family',
      name: 'Famille Démo',
      ownerEmail: FAMILY_OWNER_EMAIL,
      ownerPasswordHash,
      settings: {
        create: {
          defaultInterestRateBps: 240,
          currency: 'CHF',
        },
      },
    },
  });

  for (const parent of parentHashes) {
    await prisma.user.upsert({
      where: { id: `demo-${parent.firstName.toLowerCase()}` },
      update: {},
      create: {
        id: `demo-${parent.firstName.toLowerCase()}`,
        familyId: family.id,
        role: Role.PARENT,
        firstName: parent.firstName,
        email: parent.email,
        passwordHash: parent.passwordHash,
      },
    });
  }

  for (const child of childHashes) {
    await prisma.user.upsert({
      where: { id: `demo-${child.firstName.toLowerCase()}` },
      update: {},
      create: {
        id: `demo-${child.firstName.toLowerCase()}`,
        familyId: family.id,
        role: Role.CHILD,
        firstName: child.firstName,
        pinHash: child.pinHash,
        childAccount: {
          create: {
            balanceCents: 0,
          },
        },
      },
    });
  }

  return family;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const family = await seedDemoFamily(prisma);
    console.log(`Famille de démo prête : ${family.name} (${family.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run automatically when executed directly (`prisma db seed`), not when imported by tests.
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
