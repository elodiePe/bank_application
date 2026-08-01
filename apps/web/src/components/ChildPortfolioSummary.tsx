import { useState } from 'react';
import type { ChildBalanceSummary } from '@banque-familiale/shared';
import { useChildPortfolio } from '../hooks/useStocks.js';
import { formatMoney } from '../utils/currency.js';
import { GiftStockModal } from './GiftStockModal.js';
import { StockOrderModal } from './StockOrderModal.js';

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
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<{ symbol: string; companyName: string } | null>(null);

  const holdings = portfolio.data?.holdings ?? [];
  const totalValue = portfolio.data?.totalMarketValueCents ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBuyOpen(true)}
              aria-label="Acheter une action (débite le compte)"
              title="Acheter (débite le compte)"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/70"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setGiftOpen(true)}
              aria-label="Offrir des actions (sans débiter le compte)"
              title="Offrir (sans débiter le compte)"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-400 dark:hover:bg-brand-900/70"
            >
              🎁
            </button>
          </div>
        )}
      </div>

      {holdings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 dark:border-slate-700">
          {holdings.map((h) => (
            <li key={h.id} className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                {h.symbol} · {h.quantity} titre{h.quantity > 1 ? 's' : ''}
              </span>
              {canOffer && (
                <button
                  type="button"
                  onClick={() => setSellTarget({ symbol: h.symbol, companyName: h.companyName })}
                  aria-label={`Vendre ${h.symbol}`}
                  title="Vendre"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
                >
                  −
                </button>
              )}
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
      {buyOpen && (
        <StockOrderModal mode="BUY" forChildAccountId={child.accountId} onClose={() => setBuyOpen(false)} />
      )}
      {sellTarget && (
        <StockOrderModal
          mode="SELL"
          forChildAccountId={child.accountId}
          initialSymbol={sellTarget.symbol}
          initialCompanyName={sellTarget.companyName}
          onClose={() => setSellTarget(null)}
        />
      )}
    </div>
  );
}
