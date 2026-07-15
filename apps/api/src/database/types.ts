import type { Prisma } from '@prisma/client';

/**
 * Accepted by repositories so they work identically whether called with the top-level
 * PrismaClient or with the `tx` client inside an interactive `prisma.$transaction(...)`.
 * A full PrismaClient satisfies this narrower interface structurally.
 */
export type Db = Prisma.TransactionClient;
