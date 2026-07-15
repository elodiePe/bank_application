import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal.js';
import { useCreateStockOrder, useStockQuote, useStockSearch } from '../hooks/useStocks.js';
import { useCurrency } from '../hooks/useTransactionActions.js';
import { formatMoney } from '../utils/currency.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Solde insuffisant pour cet achat.',
  NOT_FOUND: 'Symbole introuvable.',
  EXTERNAL_SERVICE_ERROR: 'Service de cours boursiers indisponible pour le moment.',
  INVALID_INPUT: "Tu ne possèdes pas assez de cette action pour la vendre.",
};

const formSchema = z.object({
  quantity: z.coerce.number().positive('La quantité doit être positive'),
  comment: z.string().trim().max(280).optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface StockOrderModalProps {
  mode: 'BUY' | 'SELL';
  initialSymbol?: string;
  initialCompanyName?: string;
  onClose: () => void;
}

export function StockOrderModal({ mode, initialSymbol, initialCompanyName, onClose }: StockOrderModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<{ symbol: string; companyName: string } | null>(
    initialSymbol ? { symbol: initialSymbol, companyName: initialCompanyName ?? initialSymbol } : null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const search = useStockSearch(selected ? '' : debouncedQuery);
  const quote = useStockQuote(selected?.symbol ?? null);
  const currency = useCurrency();
  const createOrder = useCreateStockOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  function onSubmit(values: FormValues) {
    if (!selected) return;
    createOrder.mutate(
      {
        type: mode,
        symbol: selected.symbol,
        companyName: selected.companyName,
        quantity: values.quantity,
        comment: values.comment,
      },
      { onSuccess: onClose },
    );
  }

  const title = mode === 'BUY' ? 'Acheter une action' : `Vendre ${initialSymbol}`;

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        {mode === 'BUY' && !selected && (
          <>
            <label className="text-sm font-medium" htmlFor="stock-search">
              Chercher une action
            </label>
            <input
              id="stock-search"
              type="text"
              autoFocus
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ex: Apple, TSLA…"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            {search.isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Recherche…</p>}
            {search.data && search.data.length > 0 && (
              <ul className="max-h-48 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {search.data.map((r) => (
                  <li key={r.symbol}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <span className="font-medium">{r.symbol}</span>
                      <span className="truncate text-slate-500 dark:text-slate-400">{r.companyName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {selected && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="font-medium">
                {selected.symbol}{' '}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  {selected.companyName}
                </span>
              </p>
              {quote.isLoading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Cours en cours de chargement…</p>
              )}
              {quote.data && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Cours actuel : {formatMoney(quote.data.currentPriceCents, currency)}
                </p>
              )}
              {quote.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">Impossible de récupérer le cours.</p>
              )}
            </div>

            {mode === 'BUY' && !initialSymbol && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="self-start text-sm text-brand-600 hover:underline dark:text-brand-400"
              >
                ← Changer d'action
              </button>
            )}

            <label className="text-sm font-medium" htmlFor="quantity">
              Quantité
            </label>
            <input
              id="quantity"
              type="number"
              step="any"
              autoFocus={mode === 'SELL'}
              {...register('quantity')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.quantity && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.quantity.message}</p>
            )}

            <label className="text-sm font-medium" htmlFor="comment">
              Commentaire (optionnel)
            </label>
            <input
              id="comment"
              type="text"
              {...register('comment')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />

            {createOrder.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {createOrder.error instanceof ApiError
                  ? (ERROR_MESSAGES[createOrder.error.code] ?? 'Une erreur est survenue.')
                  : 'Une erreur est survenue.'}
              </p>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cet ordre devra être validé par un parent avant d'être exécuté.
            </p>

            <button
              type="submit"
              disabled={createOrder.isPending}
              className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {createOrder.isPending ? 'Envoi…' : mode === 'BUY' ? "Proposer l'achat" : 'Proposer la vente'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
