import { Link } from 'react-router-dom';
import { useMyPortfolio } from '../hooks/useStocks.js';
import { formatMoney } from '../utils/currency.js';

// Stock prices come straight from Finnhub, always in USD — never the family's configured
// display currency, and formatMoney doesn't convert, only relabels, so this must stay fixed.
const STOCK_CURRENCY = 'USD';

/** Compact summary on the dashboard — the full breakdown lives on its own page. */
export function PortfolioTeaser() {
  const portfolio = useMyPortfolio();

  const totalValue = portfolio.data?.totalMarketValueCents ?? 0;
  const totalCost = portfolio.data?.totalCostCents ?? 0;
  const gain = totalValue - totalCost;
  const holdingsCount = portfolio.data?.holdings.length ?? 0;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Portefeuille d'actions</h2>
        <Link to="/portfolio" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
          Voir mon portefeuille →
        </Link>
      </div>
      <Link
        to="/portfolio"
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
      >
        {portfolio.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {!portfolio.isLoading && holdingsCount === 0 && (
          <p className="text-slate-500 dark:text-slate-400">Aucune action pour le moment — clique pour en acheter.</p>
        )}
        {!portfolio.isLoading && holdingsCount > 0 && (
          <>
            <div>
              <p className="text-2xl font-bold">{formatMoney(totalValue, STOCK_CURRENCY)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {holdingsCount} position{holdingsCount > 1 ? 's' : ''}
              </p>
            </div>
            {totalCost > 0 && (
              <span
                className={
                  gain >= 0
                    ? 'rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }
              >
                {gain >= 0 ? '+' : ''}
                {formatMoney(gain, STOCK_CURRENCY)}
              </span>
            )}
          </>
        )}
      </Link>
    </section>
  );
}
