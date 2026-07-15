import { z } from 'zod';

export type StockOrderType = 'BUY' | 'SELL';
export type StockOrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface StockSearchResult {
  symbol: string;
  companyName: string;
}

export interface StockQuote {
  symbol: string;
  companyName: string;
  currentPriceCents: number;
  previousCloseCents: number;
  changePercent: number;
}

export interface StockHoldingSummary {
  id: string;
  symbol: string;
  companyName: string;
  quantity: number;
  averageCostCents: number;
  /** When this position was opened (first BUY or GIFT) — unchanged by later top-ups. */
  firstPurchaseAt: string;
  /** Null when a live quote couldn't be fetched (e.g. market data API unavailable). */
  currentPriceCents: number | null;
  marketValueCents: number | null;
  gainLossCents: number | null;
  gainLossPercent: number | null;
}

export interface StockPortfolioOverview {
  holdings: StockHoldingSummary[];
  totalMarketValueCents: number;
  totalCostCents: number;
}

export interface StockOrderSummary {
  id: string;
  requesterId: string;
  requesterFirstName: string;
  accountId: string;
  childFirstName: string;
  type: StockOrderType;
  status: StockOrderStatus;
  symbol: string;
  companyName: string;
  quantity: number;
  estimatedPriceCents: number;
  comment: string | null;
  createdAt: string;
  respondedByFirstName: string | null;
  respondedAt: string | null;
}

export const createStockOrderSchema = z.object({
  type: z.enum(['BUY', 'SELL']),
  symbol: z.string().trim().min(1).max(10).toUpperCase(),
  /** Carried over from the search result the child picked, so we don't need a second API
   * call just to resolve a display name — falls back to the symbol if omitted. */
  companyName: z.string().trim().max(120).optional(),
  quantity: z.number().positive('La quantité doit être positive'),
  comment: z.string().trim().max(280).optional(),
});
export type CreateStockOrderInput = z.infer<typeof createStockOrderSchema>;

/** A parent directly granting shares to a child — no approval step, no cash debited. */
export const giftStockSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().trim().min(1).max(10).toUpperCase(),
  companyName: z.string().trim().max(120).optional(),
  quantity: z.number().positive('La quantité doit être positive'),
  comment: z.string().trim().max(280).optional(),
});
export type GiftStockInput = z.infer<typeof giftStockSchema>;
