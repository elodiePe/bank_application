import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ChildBalanceSummary, TransactionSummary } from '@banque-familiale/shared';
import { useCurrentUser, usePermission } from '../hooks/useAuth.js';
import { useChildOverview, useMyTransactions, useParentOverview, useRecentTransactions } from '../hooks/useDashboard.js';
import { convertCents, useFxRate } from '../hooks/useFx.js';
import { useSettings } from '../hooks/useTransactionActions.js';
import { formatMoney, STORAGE_CURRENCY } from '../utils/currency.js';
import { ChildBalanceCard } from '../components/ChildBalanceCard.js';
import { ChildPortfolioSummary } from '../components/ChildPortfolioSummary.js';
import { TimelineCard } from '../components/TimelineCard.js';
import { MoneyActionModal } from '../components/MoneyActionModal.js';
import { TransferModal } from '../components/TransferModal.js';
import { CorrectionModal } from '../components/CorrectionModal.js';
import { PendingStockOrdersList } from '../components/PendingStockOrdersList.js';
import { StockPortfolioView } from '../components/StockPortfolioView.js';
import { DisputeModal } from '../components/DisputeModal.js';
import { SavingsGoalCard } from '../components/SavingsGoalCard.js';

type MoneyAction = { mode: 'DEPOSIT' | 'WITHDRAWAL'; child: ChildBalanceSummary };
type MoneySubTab = 'money' | 'stocks' | 'savings';
const SUB_TAB_LABELS: Record<MoneySubTab, string> = { money: 'Argent', stocks: 'Actions', savings: 'Épargne' };

/** Sub-tab lives in the URL (?tab=stocks) so the choice survives a reload. `tabOrder` differs
 * by page — a child gets a third "Épargne" tab a parent doesn't — so an out-of-range value
 * (e.g. a stale link to a tab this viewer doesn't have) just falls back to the first tab. */
function useMoneySubTab(tabOrder: MoneySubTab[]): [MoneySubTab, (tab: MoneySubTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as MoneySubTab | null;
  const tab: MoneySubTab = requested && tabOrder.includes(requested) ? requested : tabOrder[0]!;
  const setTab = (next: MoneySubTab) => {
    setSearchParams(next === tabOrder[0] ? {} : { tab: next }, { replace: true });
  };
  return [tab, setTab];
}

function SubTabs({
  active,
  onChange,
  tabOrder,
}: {
  active: MoneySubTab;
  onChange: (tab: MoneySubTab) => void;
  tabOrder: MoneySubTab[];
}) {
  return (
    <div className="mb-6 flex gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
      {tabOrder.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          aria-current={active === tab ? 'page' : undefined}
          className={
            active === tab
              ? 'flex-1 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white dark:bg-brand-500'
              : 'flex-1 rounded-full px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          {SUB_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

/** Renders whichever sub-tab panel is active — switched only via the SubTabs buttons, no
 * swipe gesture. */
function SubTabPanel({ tab, panels }: { tab: MoneySubTab; panels: Partial<Record<MoneySubTab, ReactNode>> }) {
  return <>{panels[tab]}</>;
}

const RECENT_TRANSACTIONS_LIMIT = 5;
const PARENT_TAB_ORDER: MoneySubTab[] = ['money', 'stocks'];
// A child also gets an "Épargne" tab for their savings goal — a parent doesn't have one of
// their own to show here.
const CHILD_TAB_ORDER: MoneySubTab[] = ['money', 'stocks', 'savings'];

/** "Argent" section: everything financial — balance, transaction history, and stock
 * trading — for both roles. The recent-transactions list is capped at 5 for everyone. */
export function MoneyPage() {
  const { data: user } = useCurrentUser();

  if (user?.role === 'PARENT') return <ParentMoneyPage />;
  return <ChildMoneyPage />;
}

function ParentMoneyPage() {
  const overview = useParentOverview();
  const recentTransactions = useRecentTransactions(RECENT_TRANSACTIONS_LIMIT);
  const { currency, rate, rateLoading } = useFxRate();
  const canManageMoney = usePermission('canManageMoney');
  const canManageActions = usePermission('canManageActions');
  const settings = useSettings();

  const tabOrder = PARENT_TAB_ORDER.filter((t) => t !== 'stocks' || settings.data?.stocksEnabled);
  const [tab, setTab] = useMoneySubTab(tabOrder);
  const [moneyAction, setMoneyAction] = useState<MoneyAction | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<TransactionSummary | null>(null);

  const totalBalance = formatMoney(convertCents(overview.data?.totalBalanceCents ?? 0, rate), currency);

  const moneyPanel = (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-center text-white shadow-md">
        <p className="text-xs text-brand-100">Solde total de la famille</p>
        <p className="mt-1 text-xl font-bold">{overview.isLoading || rateLoading ? '…' : totalBalance}</p>
      </div>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comptes des enfants</h2>
          {canManageMoney && overview.data && overview.data.children.length >= 2 && (
            <button
              type="button"
              onClick={() => setTransferOpen(true)}
              className="text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              Virement entre enfants
            </button>
          )}
        </div>
        {overview.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {overview.isError && <p className="text-red-600 dark:text-red-400">Impossible de charger les soldes.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {overview.data?.children.map((child, index) => (
            <ChildBalanceCard
              key={child.accountId}
              child={child}
              index={index}
              onDeposit={canManageMoney ? () => setMoneyAction({ mode: 'DEPOSIT', child }) : undefined}
              onWithdraw={canManageMoney ? () => setMoneyAction({ mode: 'WITHDRAWAL', child }) : undefined}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Historique récent</h2>
          <Link to="/history" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            Voir tout l'historique →
          </Link>
        </div>
        {recentTransactions.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {recentTransactions.isError && (
          <p className="text-red-600 dark:text-red-400">Impossible de charger l'historique.</p>
        )}
        {recentTransactions.data && recentTransactions.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune opération pour le moment.
          </p>
        )}
        {recentTransactions.data && recentTransactions.data.length > 0 && (
          <div className="flex flex-col gap-3">
            {recentTransactions.data.map((t, index) => (
              <TimelineCard
                key={t.id}
                transaction={t}
                index={index}
                showChildName
                onCorrect={canManageMoney ? setCorrectionTarget : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const stocksPanel = (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Portefeuilles des enfants</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {overview.data?.children.map((child, index) => (
            <ChildPortfolioSummary key={child.accountId} child={child} index={index} canOffer={canManageActions} />
          ))}
        </div>
      </section>

      <PendingStockOrdersList canAct={canManageActions} />
    </div>
  );

  return (
    <div className="space-y-6">
      {tabOrder.length > 1 && <SubTabs active={tab} onChange={setTab} tabOrder={tabOrder} />}

      <SubTabPanel tab={tab} panels={{ money: moneyPanel, stocks: stocksPanel }} />

      {moneyAction && (
        <MoneyActionModal
          mode={moneyAction.mode}
          accountId={moneyAction.child.accountId}
          childFirstName={moneyAction.child.firstName}
          onClose={() => setMoneyAction(null)}
        />
      )}
      {transferOpen && overview.data && (
        <TransferModal children={overview.data.children} onClose={() => setTransferOpen(false)} />
      )}
      {correctionTarget && (
        <CorrectionModal transaction={correctionTarget} onClose={() => setCorrectionTarget(null)} />
      )}
    </div>
  );
}

function ChildMoneyPage() {
  const { data: user } = useCurrentUser();
  const overview = useChildOverview();
  const transactions = useMyTransactions(RECENT_TRANSACTIONS_LIMIT);
  const { currency, rate, rateLoading } = useFxRate();
  const settings = useSettings();
  const tabOrder = CHILD_TAB_ORDER.filter((t) => t !== 'stocks' || settings.data?.stocksEnabled);
  const [tab, setTab] = useMoneySubTab(tabOrder);
  const [disputeTarget, setDisputeTarget] = useState<TransactionSummary | null>(null);

  const balance = formatMoney(convertCents(overview.data?.balanceCents ?? 0, rate), currency);

  const moneyPanel = (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-center text-white shadow-md">
        <p className="text-xs text-brand-100 ">Mon solde</p>
        <p className="mt-1 text-xl font-bold">{overview.isLoading || rateLoading ? '…' : balance}</p>
        {overview.data && overview.data.weeklyAllowanceCents > 0 && (
          <p className="mt-1 text-xs text-brand-100">
            Argent de poche : {formatMoney(overview.data.weeklyAllowanceCents, STORAGE_CURRENCY)} / semaine
          </p>
        )}
        {overview.data && overview.data.pointsBalance > 0 && user?.showPointsBalance !== false && (
          <p className="mt-1 text-sm text-brand-100">⭐ {overview.data.pointsBalance} points</p>
        )}
      </div>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes transactions</h2>
          <Link to="/history" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
            Voir l'historique →
          </Link>
        </div>
        {transactions.isLoading && <p className="text-slate-500 dark:text-slate-400">Chargement…</p>}
        {transactions.isError && <p className="text-red-600 dark:text-red-400">Impossible de charger l'historique.</p>}
        {transactions.data && transactions.data.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Aucune opération pour le moment.
          </p>
        )}
        {transactions.data && transactions.data.length > 0 && (
          <div className="flex flex-col gap-3">
            {transactions.data.map((t, index) => (
              <TimelineCard key={t.id} transaction={t} index={index} onDispute={setDisputeTarget} />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const stocksPanel = (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Actions boursières</h2>
        <StockPortfolioView />
      </section>
    </div>
  );

  const savingsPanel = (
    <div className="space-y-6">
      <SavingsGoalCard balanceCents={overview.data?.balanceCents ?? 0} />
    </div>
  );

  return (
    <div className="space-y-6">
      {tabOrder.length > 1 && <SubTabs active={tab} onChange={setTab} tabOrder={tabOrder} />}

      <SubTabPanel tab={tab} panels={{ money: moneyPanel, stocks: stocksPanel, savings: savingsPanel }} />

      {disputeTarget && <DisputeModal transaction={disputeTarget} onClose={() => setDisputeTarget(null)} />}
    </div>
  );
}
