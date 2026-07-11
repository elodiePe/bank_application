import { PrismaClient } from '@prisma/client';

/**
 * Single shared Prisma client for the process. Re-used across hot reloads in dev
 * (tsx watch) to avoid exhausting SQLite connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
