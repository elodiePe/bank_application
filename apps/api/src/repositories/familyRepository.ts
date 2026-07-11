import type { PrismaClient } from '@prisma/client';

export function createFamilyRepository(prisma: PrismaClient) {
  return {
    findWithMembers(familyId: string) {
      return prisma.family.findUnique({
        where: { id: familyId },
        include: {
          settings: true,
          users: { include: { childAccount: true } },
        },
      });
    },
  };
}

export type FamilyRepository = ReturnType<typeof createFamilyRepository>;
