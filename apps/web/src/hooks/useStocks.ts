import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateStockOrderInput, GiftStockInput } from '@banque-familiale/shared';
import {
  approveStockOrder,
  cancelStockOrder,
  createStockOrder,
  fetchChildPortfolio,
  fetchChildStockLots,
  fetchMyPortfolio,
  fetchMyStockLots,
  fetchMyStockOrders,
  fetchPendingStockOrders,
  fetchStockQuote,
  giftStock,
  rejectStockOrder,
  searchStocks,
} from '../services/stock.service.js';

function useInvalidateStocksAndDashboard() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['stock-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['stock-portfolio'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ['stock-search', query],
    queryFn: () => searchStocks(query),
    enabled: query.trim().length > 0,
    staleTime: 60_000,
  });
}

export function useStockQuote(symbol: string | null) {
  return useQuery({
    queryKey: ['stock-quote', symbol],
    queryFn: () => fetchStockQuote(symbol!),
    enabled: symbol !== null && symbol.length > 0,
    staleTime: 10_000,
  });
}

export function useMyPortfolio() {
  return useQuery({ queryKey: ['stock-portfolio', 'mine'], queryFn: fetchMyPortfolio, staleTime: 15_000 });
}

export function useChildPortfolio(accountId: string | null) {
  return useQuery({
    queryKey: ['stock-portfolio', accountId],
    queryFn: () => fetchChildPortfolio(accountId!),
    enabled: accountId !== null,
    staleTime: 15_000,
  });
}

export function useMyStockLots(symbol: string | null) {
  return useQuery({
    queryKey: ['stock-lots', 'mine', symbol],
    queryFn: () => fetchMyStockLots(symbol!),
    enabled: symbol !== null,
    staleTime: 15_000,
  });
}

export function useChildStockLots(accountId: string | null, symbol: string | null) {
  return useQuery({
    queryKey: ['stock-lots', accountId, symbol],
    queryFn: () => fetchChildStockLots(accountId!, symbol!),
    enabled: accountId !== null && symbol !== null,
    staleTime: 15_000,
  });
}

export function useMyStockOrders() {
  return useQuery({ queryKey: ['stock-orders', 'mine'], queryFn: fetchMyStockOrders, staleTime: 15_000 });
}

export function usePendingStockOrders() {
  return useQuery({
    queryKey: ['stock-orders', 'pending'],
    queryFn: fetchPendingStockOrders,
    staleTime: 15_000,
  });
}

export function useCreateStockOrder() {
  const invalidate = useInvalidateStocksAndDashboard();
  return useMutation({
    mutationFn: (input: CreateStockOrderInput) => createStockOrder(input),
    onSuccess: invalidate,
  });
}

export function useGiftStock() {
  const invalidate = useInvalidateStocksAndDashboard();
  return useMutation({
    mutationFn: (input: GiftStockInput) => giftStock(input),
    onSuccess: invalidate,
  });
}

export function useApproveStockOrder() {
  const invalidate = useInvalidateStocksAndDashboard();
  return useMutation({
    mutationFn: (id: string) => approveStockOrder(id),
    onSuccess: invalidate,
  });
}

export function useRejectStockOrder() {
  const invalidate = useInvalidateStocksAndDashboard();
  return useMutation({
    mutationFn: (id: string) => rejectStockOrder(id),
    onSuccess: invalidate,
  });
}

export function useCancelStockOrder() {
  const invalidate = useInvalidateStocksAndDashboard();
  return useMutation({
    mutationFn: (id: string) => cancelStockOrder(id),
    onSuccess: invalidate,
  });
}
