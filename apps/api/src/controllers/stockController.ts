import type { Request, Response } from 'express';
import { createStockOrderSchema, giftStockSchema } from '@banque-familiale/shared';
import type { StockService } from '../services/stockService.js';
import { ValidationError } from '../utils/errors.js';

export function createStockController(stockService: StockService) {
  return {
    async search(req: Request, res: Response) {
      const query = String(req.query.q ?? '').trim();
      if (!query) {
        res.json([]);
        return;
      }
      const results = await stockService.search(query);
      res.json(results);
    },

    async getQuote(req: Request, res: Response) {
      const quote = await stockService.getQuote(String(req.params.symbol));
      res.json(quote);
    },

    async getMyPortfolio(req: Request, res: Response) {
      const portfolio = await stockService.getPortfolio(req.auth!.sub);
      res.json(portfolio);
    },

    async getChildPortfolio(req: Request, res: Response) {
      const portfolio = await stockService.getPortfolioForFamilyAccount(
        String(req.params.accountId),
        req.auth!.familyId,
      );
      res.json(portfolio);
    },

    async getMyLots(req: Request, res: Response) {
      const lots = await stockService.getLots(req.auth!.sub, String(req.params.symbol));
      res.json(lots);
    },

    async getChildLots(req: Request, res: Response) {
      const lots = await stockService.getLotsForFamilyAccount(
        String(req.params.accountId),
        String(req.params.symbol),
        req.auth!.familyId,
      );
      res.json(lots);
    },

    async createOrder(req: Request, res: Response) {
      const parsed = createStockOrderSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const order = await stockService.createOrder({
        requesterId: req.auth!.sub,
        familyId: req.auth!.familyId,
        input: parsed.data,
      });
      res.status(201).json(order);
    },

    async gift(req: Request, res: Response) {
      const parsed = giftStockSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const gift = await stockService.giftShares({
        actorId: req.auth!.sub,
        actorFamilyId: req.auth!.familyId,
        input: parsed.data,
      });
      res.status(201).json(gift);
    },

    async listMine(req: Request, res: Response) {
      const orders = await stockService.listMine(req.auth!.sub);
      res.json(orders);
    },

    async listPending(req: Request, res: Response) {
      const orders = await stockService.listPendingForFamily(req.auth!.familyId);
      res.json(orders);
    },

    async approve(req: Request, res: Response) {
      const order = await stockService.approve({
        orderId: String(req.params.id),
        actorId: req.auth!.sub,
        actorFamilyId: req.auth!.familyId,
      });
      res.json(order);
    },

    async reject(req: Request, res: Response) {
      const order = await stockService.reject({
        orderId: String(req.params.id),
        actorId: req.auth!.sub,
        actorFamilyId: req.auth!.familyId,
      });
      res.json(order);
    },

    async cancel(req: Request, res: Response) {
      const order = await stockService.cancel({
        orderId: String(req.params.id),
        actorId: req.auth!.sub,
      });
      res.json(order);
    },
  };
}

export type StockController = ReturnType<typeof createStockController>;
