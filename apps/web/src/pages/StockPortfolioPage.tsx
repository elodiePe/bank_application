import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMyPortfolio, useMyStockOrders } from '../hooks/useStocks.js';
import { useTheme } from '../hooks/useTheme.js';
import { formatMoney } from '../utils/currency.js';
import { StockOrderModal } from '../components/StockOrderModal.js';
import { StockLotsModal } from '../components/StockLotsModal.js';
import { PortfolioDonut } from '../components/PortfolioDonut.js';

// Fixed-order categorical palette (validated for colorblind-safe adjacent contrast) — hue
// order never changes, so a given slot always maps to the same visual identity.
const SERIES_LIGHT = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'];
const SERIES_DARK = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767', '#d55181', '#d95926'];

// Stock prices come straight from Finnhub, always in USD — never the family's configured
// display currency, and formatMoney doesn't convert, only relabels, so this must stay fixed.
const STOCK_CURRENCY = 'USD';

export function StockPortfolioPage() {
  const portfolio = useMyPortfolio();
  const myOrders = useMyStockOrders();
  const { theme } = useTheme();
  const colors = theme === 'dark' ? SERIES_DARK : SERIES_LIGHT;
  const seriesColor = (i: number) => colors[i % colors.length] ?? colors[0]!;
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<{ symbol: string; companyName: string } | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ symbol: string; companyName: string } | null>(null);

  const holdings = portfolio.data?.holdings ?? [];
  const pendingOrders = (myOrders.data ?? []).filter((o) => o.status === 'PENDING');

  const totalValue = portfolio.data?.totalMarketValueCents ?? 0;
  const totalCost = portfolio.data?.totalCostCents ?? 0;
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            ← Retour au tableau de bord
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Portefeuille d'actions</h1>
        </div>
        <button
          type="button"
          onClick={() => setBuyOpen(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          Ajouter une action
        </button>
      </div>

      {portfolio.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
      {portfolio.isError && (
        <p className="text-red-600 dark:text-red-400">Impossible de charger le portefeuille.</p>
      )}

      {portfolio.data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-md sm:flex-row sm:items-center"
        >
          <div className="relative shrink-0">
            {holdings.length > 0 ? (
              <>
                <PortfolioDonut
                  segments={holdings.map((h, i) => ({ color: seriesColor(i), value: h.marketValueCents ?? 0 }))}
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] uppercase tracking-wide text-brand-100">Total</span>
                  <span className="text-base font-bold">{formatMoney(totalValue, STOCK_CURRENCY)}</span>
                </div>
              </>
            ) : (
              <div className="flex h-[168px] w-[168px] items-center justify-center rounded-full border-4 border-dashed border-white/30 px-4 text-center text-sm text-brand-100">
                Aucune position
              </div>
            )}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm text-brand-100">Valeur totale du portefeuille</p>
            <p className="mt-1 text-3xl font-bold">{formatMoney(totalValue, STOCK_CURRENCY)}</p>
            {totalCost > 0 && (
              <p
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                  totalGain >= 0 ? 'bg-emerald-400/20 text-emerald-50' : 'bg-red-400/20 text-red-50'
                }`}
              >
                {totalGain >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(totalGain), STOCK_CURRENCY)} (
                {totalGainPercent >= 0 ? '+' : ''}
                {totalGainPercent.toFixed(1)}%)
              </p>
            )}
          </div>
        </motion.div>
      )}

      {holdings.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Répartition</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {holdings.map((h, i) => (
              <motion.li
                key={h.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setDetailTarget({ symbol: h.symbol, companyName: h.companyName })}
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: seriesColor(i) }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {h.symbol}{' '}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{h.companyName}</span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {h.quantity} titre{h.quantity > 1 ? 's' : ''} ·{' '}
                    {h.marketValueCents !== null ? formatMoney(h.marketValueCents, STOCK_CURRENCY) : '—'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Depuis le {new Date(h.firstPurchaseAt).toLocaleDateString('fr-CH')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {h.gainLossCents !== null && (
                    <span
                      className={`text-sm font-semibold ${
                        h.gainLossCents >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {h.gainLossCents >= 0 ? '+' : ''}
                      {formatMoney(h.gainLossCents, STOCK_CURRENCY)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSellTarget({ symbol: h.symbol, companyName: h.companyName });
                    }}
                    className="text-xs text-red-600 hover:underline dark:text-red-400"
                  >
                    Vendre
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      {portfolio.data && holdings.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Aucune action pour le moment. Clique sur « Acheter une action » pour commencer.
        </p>
      )}

      {pendingOrders.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Ordres en attente</h2>
          <ul className="flex flex-col gap-2">
            {pendingOrders.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {o.type === 'BUY' ? 'Achat' : 'Vente'} de {o.quantity} {o.symbol}
                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">en attente d'un parent</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {buyOpen && <StockOrderModal mode="BUY" onClose={() => setBuyOpen(false)} />}
      {sellTarget && (
        <StockOrderModal
          mode="SELL"
          initialSymbol={sellTarget.symbol}
          initialCompanyName={sellTarget.companyName}
          onClose={() => setSellTarget(null)}
        />
      )}
      {detailTarget && (
        <StockLotsModal
          symbol={detailTarget.symbol}
          companyName={detailTarget.companyName}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}
