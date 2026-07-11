export function formatChf(cents: number): string {
  return (cents / 100).toLocaleString('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
