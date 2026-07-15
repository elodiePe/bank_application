import type {
  CreateStockOrderInput,
  GiftStockInput,
  StockOrderSummary,
  StockPortfolioOverview,
  StockQuote,
  StockSearchResult,
} from '@banque-familiale/shared';
import { apiGet, apiPost } from './api.js';

export function searchStocks(query: string): Promise<StockSearchResult[]> {
  return apiGet<StockSearchResult[]>(`/stocks/search?q=${encodeURIComponent(query)}`);
}

export function fetchStockQuote(symbol: string): Promise<StockQuote> {
  return apiGet<StockQuote>(`/stocks/quote/${encodeURIComponent(symbol)}`);
}

export function fetchMyPortfolio(): Promise<StockPortfolioOverview> {
  return apiGet<StockPortfolioOverview>('/stocks/portfolio');
}

export function fetchChildPortfolio(accountId: string): Promise<StockPortfolioOverview> {
  return apiGet<StockPortfolioOverview>(`/stocks/portfolio/${accountId}`);
}

export function createStockOrder(input: CreateStockOrderInput): Promise<StockOrderSummary> {
  return apiPost<StockOrderSummary>('/stocks/orders', input);
}

export function giftStock(input: GiftStockInput): Promise<StockOrderSummary> {
  return apiPost<StockOrderSummary>('/stocks/gift', input);
}

export function fetchMyStockOrders(): Promise<StockOrderSummary[]> {
  return apiGet<StockOrderSummary[]>('/stocks/orders/mine');
}

export function fetchPendingStockOrders(): Promise<StockOrderSummary[]> {
  return apiGet<StockOrderSummary[]>('/stocks/orders/pending');
}

export function approveStockOrder(id: string): Promise<StockOrderSummary> {
  return apiPost<StockOrderSummary>(`/stocks/orders/${id}/approve`);
}

export function rejectStockOrder(id: string): Promise<StockOrderSummary> {
  return apiPost<StockOrderSummary>(`/stocks/orders/${id}/reject`);
}

export function cancelStockOrder(id: string): Promise<StockOrderSummary> {
  return apiPost<StockOrderSummary>(`/stocks/orders/${id}/cancel`);
}
