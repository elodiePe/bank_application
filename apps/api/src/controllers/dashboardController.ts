import type { Request, Response } from 'express';
import type { DashboardService } from '../services/dashboardService.js';

export function createDashboardController(dashboardService: DashboardService) {
  return {
    async getOverview(req: Request, res: Response) {
      const overview = await dashboardService.getParentOverview(req.auth!.familyId);
      res.json(overview);
    },

    async getRecentTransactions(req: Request, res: Response) {
      const limitParam = Number(req.query.limit);
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 15;
      const transactions = await dashboardService.getRecentFamilyTransactions(req.auth!.familyId, limit);
      res.json(transactions);
    },
  };
}

export type DashboardController = ReturnType<typeof createDashboardController>;
