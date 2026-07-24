import { useQuery } from '@tanstack/react-query';
import { fetchFxRate } from '../services/fx.service.js';
import { useCurrency } from './useTransactionActions.js';

/// All cash balances are stored assuming CHF. When the family's display currency isn't
/// CHF, this fetches today's conversion rate so totals can be shown converted rather than
/// just relabeled. `rate` is 1 (identity) for CHF, and null only while a non-CHF rate is
/// still loading — callers should fall back to the unconverted amount in that case.
export function useFxRate() {
  const currency = useCurrency();
  const query = useQuery({
    queryKey: ['fx-rate', currency],
    queryFn: () => fetchFxRate(currency),
    enabled: currency !== 'CHF',
    staleTime: 60 * 60 * 1000,
  });

  return {
    currency,
    rate: currency === 'CHF' ? 1 : (query.data?.rate ?? null),
  };
}

export function convertCents(cents: number, rate: number | null): number {
  return rate === null ? cents : Math.round(cents * rate);
}
