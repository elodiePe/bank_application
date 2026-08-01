import type { Db } from '../database/types.js';

export function createPersonalTaskRepository(prisma: Db) {
  return {
    listForUser(userId: string) {
      return prisma.personalTask.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    },

    findById(id: string) {
      return prisma.personalTask.findUnique({ where: { id } });
    },

    create(data: { familyId: string; userId: string; title: string; recurring: boolean; date: Date | null }) {
      return prisma.personalTask.create({ data });
    },

    update(id: string, data: { title?: string; done?: boolean; lastDoneDate?: Date | null; date?: Date }) {
      return prisma.personalTask.update({ where: { id }, data });
    },

    delete(id: string) {
      return prisma.personalTask.delete({ where: { id } });
    },
  };
}

export type PersonalTaskRepository = ReturnType<typeof createPersonalTaskRepository>;
