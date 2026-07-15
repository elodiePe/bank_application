import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal.js';
import { useChildPortfolio, useGiftStock, useStockQuote, useStockSearch } from '../hooks/useStocks.js';
import { formatMoney } from '../utils/currency.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Symbole introuvable.',
  EXTERNAL_SERVICE_ERROR: 'Service de cours boursiers indisponible pour le moment.',
};

// Stock prices come straight from Finnhub, always in USD — never the family's configured
// display currency, and formatMoney doesn't convert, only relabels, so this must stay fixed.
const STOCK_CURRENCY = 'USD';

const formSchema = z.object({
  quantity: z.coerce.number().positive('La quantité doit être positive'),
  comment: z.string().trim().max(280).optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface GiftStockModalProps {
  accountId: string;
  childFirstName: string;
  onClose: () => void;
}

export function GiftStockModal({ accountId, childFirstName, onClose }: GiftStockModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<{ symbol: string; companyName: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const search = useStockSearch(selected ? '' : debouncedQuery);
  const quote = useStockQuote(selected?.symbol ?? null);
  const portfolio = useChildPortfolio(accountId);
  const giftStock = useGiftStock();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  function onSubmit(values: FormValues) {
    if (!selected) return;
    giftStock.mutate(
      {
        accountId,
        symbol: selected.symbol,
        companyName: selected.companyName,
        quantity: values.quantity,
        comment: values.comment,
      },
      { onSuccess: onClose },
    );
  }

  const holdings = portfolio.data?.holdings ?? [];

  return (
    <Modal open onClose={onClose} title={`Offrir des actions à ${childFirstName}`}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ces actions sont ajoutées directement au portefeuille de {childFirstName}, sans passer par une
          demande et sans toucher à son solde.
        </p>

        {holdings.length > 0 && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <p className="mb-1 font-medium">Portefeuille actuel</p>
            <ul className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400">
              {holdings.map((h) => (
                <li key={h.id}>
                  {h.symbol} · {h.quantity} titre{h.quantity > 1 ? 's' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!selected && (
          <>
            <label className="text-sm font-medium" htmlFor="gift-stock-search">
              Chercher une action
            </label>
            <input
              id="gift-stock-search"
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
                  Cours actuel : {formatMoney(quote.data.currentPriceCents, STOCK_CURRENCY)}
                </p>
              )}
              {quote.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">Impossible de récupérer le cours.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="self-start text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              ← Changer d'action
            </button>

            <label className="text-sm font-medium" htmlFor="gift-quantity">
              Quantité
            </label>
            <input
              id="gift-quantity"
              type="number"
              step="any"
              {...register('quantity')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.quantity && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.quantity.message}</p>
            )}

            <label className="text-sm font-medium" htmlFor="gift-comment">
              Message (optionnel)
            </label>
            <input
              id="gift-comment"
              type="text"
              {...register('comment')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />

            {giftStock.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {giftStock.error instanceof ApiError
                  ? (ERROR_MESSAGES[giftStock.error.code] ?? 'Une erreur est survenue.')
                  : 'Une erreur est survenue.'}
              </p>
            )}

            <button
              type="submit"
              disabled={giftStock.isPending}
              className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {giftStock.isPending ? 'Envoi…' : 'Offrir ces actions'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
