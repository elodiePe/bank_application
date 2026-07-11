import type { PrismaClient, Prisma } from '@prisma/client';

export function createAuditLogRepository(prisma: PrismaClient) {
  return {
    record(params: {
      actorId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Prisma.InputJsonValue;
    }) {
      return prisma.auditLog.create({ data: params });
    },
  };
}

export type AuditLogRepository = ReturnType<typeof createAuditLogRepository>;
