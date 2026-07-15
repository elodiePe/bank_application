import https from 'node:https';
import type { StockQuote, StockSearchResult } from '@banque-familiale/shared';
import { env } from '../utils/env.js';
import { ExternalServiceError, NotFoundError } from '../utils/errors.js';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
// Short-lived — good enough to avoid hammering the free-tier rate limit when the same
// symbol is viewed by several family members within a few seconds, without ever showing
// a meaningfully stale price.
const QUOTE_CACHE_TTL_MS = 15_000;

interface FinnhubSearchResult {
  result: { symbol: string; description: string; type: string }[];
}

/**
 * Finnhub's free plan only serves quotes for US-listed stocks — foreign exchanges
 * (Swiss, London, Tokyo, ...) return a 403 even though /search happily lists them. There's
 * no "exchange" field on search results to filter by directly, so symbols are excluded by
 * their Finnhub exchange-suffix instead. This is a blocklist, not an allowlist, because
 * genuine US share classes also use a dot (e.g. BRK.A, BRK.B, BF.B) and must stay in.
 */
const NON_US_EXCHANGE_SUFFIXES = [
  '.L', '.SW', '.T', '.SS', '.SZ', '.HK', '.TO', '.V', '.PA', '.DE', '.MI', '.AS', '.AX',
  '.KL', '.SI', '.SA', '.RO', '.NS', '.BO', '.KS', '.KQ', '.TW', '.TWO', '.ST', '.OL',
  '.CO', '.HE', '.WA', '.BR', '.VI', '.IS', '.JK', '.BK', '.MX', '.SN', '.NZ', '.IR',
  '.AT', '.QA', '.SR', '.TA', '.JO', '.IL', '.MC', '.LS', '.PR', '.BD', '.F', '.DU', '.HM',
];

function isUsListedSymbol(symbol: string): boolean {
  return !NON_US_EXCHANGE_SUFFIXES.some((suffix) => symbol.endsWith(suffix));
}

interface FinnhubQuote {
  c: number; // current price
  pc: number; // previous close
}

interface CachedPrice {
  currentPriceCents: number;
  previousCloseCents: number;
  changePercent: number;
  expiresAt: number;
}

// Only the numeric price fields are cached — companyName is deliberately excluded so a
// later call with a better hint (e.g. from a search result) is never shadowed by an
// earlier call's fallback of "no name available, use the symbol".
const priceCache = new Map<string, CachedPrice>();

function requireApiKey(): string {
  if (!env.finnhubApiKey) {
    throw new ExternalServiceError("Le service de cours boursiers n'est pas configuré.");
  }
  return env.finnhubApiKey;
}

/**
 * Node's built-in `fetch` (undici) hangs indefinitely on some networks that advertise
 * IPv6 (AAAA records) but don't actually route it — a "black hole" that undici's fetch
 * doesn't fail past. Node's older `https` module supports Happy-Eyeballs-style fallback
 * via `family: 4`, which sidesteps the issue entirely, so it's used here instead.
 */
function httpsGetJson<T>(url: URL): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { family: 4, timeout: 8000, headers: { Accept: 'application/json' } },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Finnhub responded with status ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Finnhub request timed out')));
    req.on('error', reject);
  });
}

async function finnhubGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = requireApiKey();
  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('token', apiKey);

  try {
    return await httpsGetJson<T>(url);
  } catch {
    throw new ExternalServiceError('Impossible de contacter le service de cours boursiers.');
  }
}

export function createStockPriceService() {
  return {
    async search(query: string): Promise<StockSearchResult[]> {
      const data = await finnhubGet<FinnhubSearchResult>('/search', { q: query });
      return (data.result ?? [])
        .filter((r) => r.type === 'Common Stock' && isUsListedSymbol(r.symbol))
        .slice(0, 10)
        .map((r) => ({ symbol: r.symbol, companyName: r.description }));
    },

    /** companyNameHint avoids a second API call when the caller already knows the name
     * (e.g. approving an order that already recorded it at request time). */
    async getQuote(symbol: string, companyNameHint?: string): Promise<StockQuote> {
      const cached = priceCache.get(symbol);
      const price =
        cached && cached.expiresAt > Date.now()
          ? cached
          : await (async () => {
              const data = await finnhubGet<FinnhubQuote>('/quote', { symbol });
              if (!data.c || data.c <= 0) {
                throw new NotFoundError('Symbole boursier introuvable.');
              }
              const fresh: CachedPrice = {
                currentPriceCents: Math.round(data.c * 100),
                previousCloseCents: Math.round(data.pc * 100),
                changePercent: data.pc > 0 ? ((data.c - data.pc) / data.pc) * 100 : 0,
                expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
              };
              priceCache.set(symbol, fresh);
              return fresh;
            })();

      return {
        symbol,
        companyName: companyNameHint ?? symbol,
        currentPriceCents: price.currentPriceCents,
        previousCloseCents: price.previousCloseCents,
        changePercent: price.changePercent,
      };
    },
  };
}

export type StockPriceService = ReturnType<typeof createStockPriceService>;
