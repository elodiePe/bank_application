import type { Prisma } from '@prisma/client';
import type { Db } from '../database/types.js';

export function createAuditLogRepository(prisma: Db) {
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
