const CURRENCY_LOCALE: Record<string, string> = {
  CHF: 'fr-CH',
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
  CAD: 'en-CA',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  INR: 'en-IN',
  CNY: 'zh-CN',
};

/**
 * Display-only formatter. Amounts are always stored as integer cents (1/100th of a
 * unit) regardless of currency, so every currency is forced to 2 decimals here — this
 * keeps the existing money model intact instead of reinterpreting minor units per
 * currency (e.g. JPY has none in reality).
 */
export function formatMoney(cents: number, currency: string): string {
  return (cents / 100).toLocaleString(CURRENCY_LOCALE[currency] ?? 'fr-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
