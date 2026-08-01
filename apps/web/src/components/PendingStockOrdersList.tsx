import { useApproveStockOrder, usePendingStockOrders, useRejectStockOrder } from '../hooks/useStocks.js';
import { formatMoney } from '../utils/currency.js';

// Stock prices come straight from Finnhub, always in USD — never the family's configured
// display currency, and formatMoney doesn't convert, only relabels, so this must stay fixed.
const STOCK_CURRENCY = 'USD';

export function PendingStockOrdersList({ canAct = true }: { canAct?: boolean }) {
  const pending = usePendingStockOrders();
  const approve = useApproveStockOrder();
  const reject = useRejectStockOrder();

  if (!pending.data || pending.data.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Ordres en bourse en attente</h2>
      <ul className="flex flex-col gap-2">
        {pending.data.map((o) => (
          <li
            key={o.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {o.childFirstName} veut {o.type === 'BUY' ? 'acheter' : 'vendre'} {o.quantity} {o.symbol}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {o.companyName} · ~{formatMoney(o.estimatedPriceCents * o.quantity, STOCK_CURRENCY)}
                {o.comment ? ` · ${o.comment}` : ''}
              </p>
            </div>
            {canAct && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => approve.mutate(o.id)}
                  disabled={approve.isPending || reject.isPending}
                  className="flex-1 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-60 sm:flex-none dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/70"
                >
                  Accepter
                </button>
                <button
                  type="button"
                  onClick={() => reject.mutate(o.id)}
                  disabled={approve.isPending || reject.isPending}
                  className="flex-1 rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-60 sm:flex-none dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
                >
                  Refuser
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
