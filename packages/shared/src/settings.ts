import { z } from 'zod';

export interface FamilySettings {
  defaultInterestRateBps: number;
  currency: string;
}

/** Display-only — amounts stay stored as integer cents; switching currency just changes
 * the symbol/format used to render them, it never converts existing balances. */
export const SUPPORTED_CURRENCIES = [
  { code: 'CHF', label: 'Franc suisse (CHF)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'Dollar américain (USD)' },
  { code: 'GBP', label: 'Livre sterling (GBP)' },
  { code: 'CAD', label: 'Dollar canadien (CAD)' },
  { code: 'JPY', label: 'Yen japonais (JPY)' },
  { code: 'AUD', label: 'Dollar australien (AUD)' },
  { code: 'SEK', label: 'Couronne suédoise (SEK)' },
  { code: 'NOK', label: 'Couronne norvégienne (NOK)' },
  { code: 'DKK', label: 'Couronne danoise (DKK)' },
  { code: 'INR', label: 'Roupie indienne (INR)' },
  { code: 'CNY', label: 'Yuan chinois (CNY)' },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

export const currencySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES.map((c) => c.code) as [CurrencyCode, ...CurrencyCode[]]),
});
export type CurrencyInput = z.infer<typeof currencySchema>;
