import type { PrismaClient } from '@prisma/client';

export function createRefreshSessionRepository(prisma: PrismaClient) {
  return {
    create(params: { id: string; userId: string; tokenHash: string; expiresAt: Date }) {
      return prisma.refreshSession.create({ data: params });
    },

    /// Combines the find-then-revoke pattern into one round trip — returns how many rows
    /// were actually revoked (0 means the token was already invalid/expired/revoked), so the
    /// caller can still tell "was this a real active session" without a separate read first.
    async revokeActiveByTokenHash(tokenHash: string): Promise<number> {
      const result = await prisma.refreshSession.updateMany({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { revokedAt: new Date() },
      });
      return result.count;
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
