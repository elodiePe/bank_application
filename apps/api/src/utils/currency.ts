export function formatChf(amountCents: number): string {
  return `${(amountCents / 100).toFixed(2)} CHF`;
}
