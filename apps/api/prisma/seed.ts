import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Demo credentials — for local development only, never used in a real deployment.
 * Parents log in with a password (and may optionally add a PIN later); children
 * log in with a 4-digit PIN only.
 */
const DEMO_PARENTS = [
  { firstName: 'Papa', password: 'papa1234', pin: '1111' },
  { firstName: 'Maman', password: 'maman1234', pin: '2222' },
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
  const family = await prisma.family.upsert({
    where: { id: 'demo-family' },
    update: {},
    create: {
      id: 'demo-family',
      name: 'Famille Démo',
      settings: {
        create: {
          defaultInterestRateBps: 240,
          currency: 'CHF',
        },
      },
    },
  });

  for (const parent of DEMO_PARENTS) {
    const passwordHash = await bcrypt.hash(parent.password, SALT_ROUNDS);
    const pinHash = await bcrypt.hash(parent.pin, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { id: `demo-${parent.firstName.toLowerCase()}` },
      update: {},
      create: {
        id: `demo-${parent.firstName.toLowerCase()}`,
        familyId: family.id,
        role: Role.PARENT,
        firstName: parent.firstName,
        passwordHash,
        pinHash,
      },
    });
  }

  for (const child of DEMO_CHILDREN) {
    const pinHash = await bcrypt.hash(child.pin, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { id: `demo-${child.firstName.toLowerCase()}` },
      update: {},
      create: {
        id: `demo-${child.firstName.toLowerCase()}`,
        familyId: family.id,
        role: Role.CHILD,
        firstName: child.firstName,
        pinHash,
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
