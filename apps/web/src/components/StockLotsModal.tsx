import { Modal } from './Modal.js';
import { useMyStockLots } from '../hooks/useStocks.js';
import { formatMoney } from '../utils/currency.js';

// Stock prices come straight from Finnhub, always in USD — never the family's configured
// display currency, and formatMoney doesn't convert, only relabels, so this must stay fixed.
const STOCK_CURRENCY = 'USD';

const TYPE_LABEL: Record<string, string> = {
  BUY: 'Achat',
  SELL: 'Vente',
  GIFT: 'Cadeau',
};

interface StockLotsModalProps {
  symbol: string;
  companyName: string;
  onClose: () => void;
}

export function StockLotsModal({ symbol, companyName, onClose }: StockLotsModalProps) {
  const lots = useMyStockLots(symbol);

  return (
    <Modal open onClose={onClose} title={`${symbol} — ${companyName}`}>
      <div className="flex flex-col gap-3">
        {lots.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>}
        {lots.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">Impossible de charger le détail.</p>
        )}
        {lots.data && lots.data.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun mouvement trouvé pour ce titre.</p>
        )}

        {lots.data && lots.data.length > 0 && (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {lots.data.map((lot) => (
              <li
                key={lot.id}
                className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {TYPE_LABEL[lot.type] ?? lot.type} · {lot.quantity} titre{lot.quantity > 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {new Date(lot.occurredAt).toLocaleDateString('fr-CH')}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>
                    {formatMoney(lot.pricePerShareCents, STOCK_CURRENCY)}/titre ·{' '}
                    {formatMoney(lot.totalCents, STOCK_CURRENCY)} au total
                  </span>
                  {lot.gainLossCents !== null && (
                    <span
                      className={
                        lot.gainLossCents >= 0
                          ? 'font-medium text-emerald-600 dark:text-emerald-400'
                          : 'font-medium text-red-600 dark:text-red-400'
                      }
                    >
                      {lot.gainLossCents >= 0 ? '+' : ''}
                      {formatMoney(lot.gainLossCents, STOCK_CURRENCY)} (
                      {lot.gainLossPercent !== null ? lot.gainLossPercent.toFixed(1) : '0'}%)
                    </span>
                  )}
                </div>
                {lot.comment && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{lot.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
