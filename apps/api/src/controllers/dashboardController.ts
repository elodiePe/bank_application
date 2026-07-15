import type { Request, Response } from 'express';
import type { TransactionListQuery } from '@banque-familiale/shared';
import type { DashboardService } from '../services/dashboardService.js';

function parseLimit(req: Request): number {
  const limitParam = Number(req.query.limit);
  return Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 15;
}

function parseTransactionListQuery(req: Request): TransactionListQuery {
  const q = req.query;
  return {
    search: typeof q.search === 'string' ? q.search : undefined,
    type: typeof q.type === 'string' ? (q.type as TransactionListQuery['type']) : undefined,
    status: typeof q.status === 'string' ? (q.status as TransactionListQuery['status']) : undefined,
    childUserId: typeof q.childUserId === 'string' ? q.childUserId : undefined,
    dateFrom: typeof q.dateFrom === 'string' ? q.dateFrom : undefined,
    dateTo: typeof q.dateTo === 'string' ? q.dateTo : undefined,
    sortBy: q.sortBy === 'amountCents' ? 'amountCents' : 'occurredAt',
    sortDir: q.sortDir === 'asc' ? 'asc' : 'desc',
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  };
}

export function createDashboardController(dashboardService: DashboardService) {
  return {
    async getOverview(req: Request, res: Response) {
      const overview = await dashboardService.getParentOverview(req.auth!.familyId);
      res.json(overview);
    },

    async getRecentTransactions(req: Request, res: Response) {
      const transactions = await dashboardService.getRecentFamilyTransactions(
        req.auth!.familyId,
        parseLimit(req),
      );
      res.json(transactions);
    },

    async getMyOverview(req: Request, res: Response) {
      const overview = await dashboardService.getChildOverview(req.auth!.sub, req.auth!.familyId);
      res.json(overview);
    },

    async getMyTransactions(req: Request, res: Response) {
      const transactions = await dashboardService.getMyTransactions(req.auth!.sub, parseLimit(req));
      res.json(transactions);
    },

    async searchTransactions(req: Request, res: Response) {
      const result = await dashboardService.searchFamilyTransactions(
        req.auth!.familyId,
        parseTransactionListQuery(req),
      );
      res.json(result);
    },

    async searchMyTransactions(req: Request, res: Response) {
      const result = await dashboardService.searchMyTransactions(
        req.auth!.sub,
        req.auth!.familyId,
        parseTransactionListQuery(req),
      );
      res.json(result);
    },
  };
}

export type DashboardController = ReturnType<typeof createDashboardController>;
