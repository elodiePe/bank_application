import { useApproveStockOrder, usePendingStockOrders, useRejectStockOrder } from '../hooks/useStocks.js';
import { useCurrency } from '../hooks/useTransactionActions.js';
import { formatMoney } from '../utils/currency.js';

export function PendingStockOrdersList() {
  const pending = usePendingStockOrders();
  const approve = useApproveStockOrder();
  const reject = useRejectStockOrder();
  const currency = useCurrency();

  if (!pending.data || pending.data.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Ordres en bourse en attente</h2>
      <ul className="flex flex-col gap-2">
        {pending.data.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="font-medium">
                {o.childFirstName} veut {o.type === 'BUY' ? 'acheter' : 'vendre'} {o.quantity} {o.symbol}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {o.companyName} · ~{formatMoney(o.estimatedPriceCents * o.quantity, currency)}
                {o.comment ? ` · ${o.comment}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => approve.mutate(o.id)}
                disabled={approve.isPending || reject.isPending}
                className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/70"
              >
                Accepter
              </button>
              <button
                type="button"
                onClick={() => reject.mutate(o.id)}
                disabled={approve.isPending || reject.isPending}
                className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/70"
              >
                Refuser
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
