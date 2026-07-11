import type { PrismaClient } from '@prisma/client';

export function createRefreshSessionRepository(prisma: PrismaClient) {
  return {
    create(params: { id: string; userId: string; tokenHash: string; expiresAt: Date }) {
      return prisma.refreshSession.create({ data: params });
    },

    findActiveByTokenHash(tokenHash: string) {
      return prisma.refreshSession.findFirst({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      });
    },

    revoke(id: string) {
      return prisma.refreshSession.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    },

    revokeAllForUser(userId: string) {
      return prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },
  };
}

export type RefreshSessionRepository = ReturnType<typeof createRefreshSessionRepository>;
