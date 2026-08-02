import { z } from 'zod';

export interface FamilySettings {
  defaultInterestRateBps: number;
  currency: string;
  stocksEnabled: boolean;
  mealPlanEnabled: boolean;
  shoppingListEnabled: boolean;
  laundryEnabled: boolean;
}

/** Off by default for a new family — a parent turns on whichever of these sections they
 * actually want, during onboarding or later from Paramètres. Partial: a caller only sends the
 * toggles it's actually changing. */
export const updateFeatureFlagsSchema = z
  .object({
    stocksEnabled: z.boolean().optional(),
    mealPlanEnabled: z.boolean().optional(),
    shoppingListEnabled: z.boolean().optional(),
    laundryEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Au moins une option requise' });
export type UpdateFeatureFlagsInput = z.infer<typeof updateFeatureFlagsSchema>;

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
