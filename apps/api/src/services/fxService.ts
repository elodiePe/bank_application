import https from 'node:https';

const BASE_CURRENCY = 'CHF';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — exchange rates don't need to be more real-time than this.

interface CachedRate {
  rate: number;
  asOf: string;
  fetchedAt: number;
}

const cache = new Map<string, CachedRate>();

/** Node's global `fetch` (undici) doesn't reliably honor `dns.setDefaultResultOrder` for its
 * own connector — on networks where this host's IPv6 route is unreachable, `fetch` still hangs
 * until the connect timeout even after forcing IPv4 result order. Node's plain `https` module
 * with an explicit `family: 4` on the socket doesn't have that problem, so it's used here
 * instead of `fetch` for this one external call. */
function getJson<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      { hostname: 'api.frankfurter.dev', path, family: 4, timeout: 10_000 },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Frankfurter request failed: ${res.statusCode}`));
          return;
        }
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Frankfurter request timed out')));
    req.on('error', reject);
  });
}

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

      const data = await getJson<{ date: string; rates: Record<string, number> }>(
        `/v1/latest?base=${BASE_CURRENCY}&symbols=${target}`,
      );
      const rate = data.rates[target];
      if (typeof rate !== 'number') throw new Error(`No rate returned for ${target}`);

      cache.set(target, { rate, asOf: data.date, fetchedAt: Date.now() });
      return { base: BASE_CURRENCY, target, rate, asOf: data.date };
    },
  };
}

export type FxService = ReturnType<typeof createFxService>;
