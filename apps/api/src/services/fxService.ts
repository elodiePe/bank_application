const BASE_CURRENCY = 'CHF';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — exchange rates don't need to be more real-time than this.

interface CachedRate {
  rate: number;
  asOf: string;
  fetchedAt: number;
}

const cache = new Map<string, CachedRate>();

export function createFxService() {
  return {
    /// All cash balances are stored assuming CHF (the app's original currency), so this
    /// always converts from CHF to the family's chosen display currency.
    async getRate(target: string): Promise<{ base: string; target: string; rate: number; asOf: string }> {
      if (target === BASE_CURRENCY) {
        return { base: BASE_CURRENCY, target, rate: 1, asOf: new Date().toISOString().slice(0, 10) };
      }

      const cached = cache.get(target);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return { base: BASE_CURRENCY, target, rate: cached.rate, asOf: cached.asOf };
      }

      const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}&symbols=${target}`);
      if (!res.ok) throw new Error(`Frankfurter request failed: ${res.status}`);
      const data = (await res.json()) as { date: string; rates: Record<string, number> };
      const rate = data.rates[target];
      if (typeof rate !== 'number') throw new Error(`No rate returned for ${target}`);

      cache.set(target, { rate, asOf: data.date, fetchedAt: Date.now() });
      return { base: BASE_CURRENCY, target, rate, asOf: data.date };
    },
  };
}

export type FxService = ReturnType<typeof createFxService>;
