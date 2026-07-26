import { useState } from 'react';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { useChildPortfolio } from '../hooks/useStocks.js';
import { formatMoney } from '../utils/currency.js';
import { GiftStockModal } from './GiftStockModal.js';

// Stock prices come straight from Finnhub, always in USD — never the family's configured
// display currency, and formatMoney doesn't convert, only relabels, so this must stay fixed.
const STOCK_CURRENCY = 'USD';

interface ChildPortfolioSummaryProps {
  child: ChildBalanceSummary;
  index: number;
  canOffer?: boolean;
}

export function ChildPortfolioSummary({ child, canOffer = true }: ChildPortfolioSummaryProps) {
  const portfolio = useChildPortfolio(child.accountId);
  const [giftOpen, setGiftOpen] = useState(false);

  const holdings = portfolio.data?.holdings ?? [];
  const totalValue = portfolio.data?.totalMarketValueCents ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-semibold text-white">
            {child.firstName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <span className="block font-medium">{child.firstName}</span>
            <span className="block text-sm text-slate-500 dark:text-slate-400">
              {holdings.length === 0
                ? 'Aucune action'
                : `${formatMoney(totalValue, STOCK_CURRENCY)} · ${holdings.length} position${holdings.length > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        {canOffer && (
          <button
            type="button"
            onClick={() => setGiftOpen(true)}
            className="rounded-lg bg-brand-100 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-400 dark:hover:bg-brand-900/70"
          >
            🎁 Offrir
          </button>
        )}
      </div>

      {holdings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-0.5 border-t border-slate-200 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {holdings.map((h) => (
            <li key={h.id}>
              {h.symbol} · {h.quantity} titre{h.quantity > 1 ? 's' : ''}
            </li>
          ))}
        </ul>
      )}

      {giftOpen && (
        <GiftStockModal
          accountId={child.accountId}
          childFirstName={child.firstName}
          onClose={() => setGiftOpen(false)}
        />
      )}
    </div>
  );
}
