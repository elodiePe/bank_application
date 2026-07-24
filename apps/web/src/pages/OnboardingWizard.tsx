import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_CURRENCIES, bootstrapParentSchema, type BootstrapParentInput } from '@banque-familiale/shared';
import { useAddMember } from '../hooks/useMembers.js';
import { useParentOverview, useCompleteOnboarding } from '../hooks/useDashboard.js';
import { useSetWeeklyAllowance, useSettings, useUpdateCurrency, useUpdateInterestRate } from '../hooks/useTransactionActions.js';
import { usePushSubscription } from '../pwa/usePushSubscription.js';
import { STORAGE_CURRENCY } from '../utils/currency.js';
import { ApiError } from '../services/api.js';

type Phase = 'welcome' | 'currency' | 'child' | 'allowance' | 'moreChildren' | 'parents' | 'interest' | 'push' | 'done';

const SECTIONS: { label: string; phases: Phase[] }[] = [
  { label: 'Bienvenue', phases: ['welcome'] },
  { label: 'Devise', phases: ['currency'] },
  { label: 'Enfants', phases: ['child', 'allowance', 'moreChildren'] },
  { label: 'Parents', phases: ['parents'] },
  { label: 'Réglages', phases: ['interest', 'push'] },
  { label: 'Terminé', phases: ['done'] },
];

function StepShell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function ProgressDots({ phase }: { phase: Phase }) {
  const activeIndex = SECTIONS.findIndex((s) => s.phases.includes(phase));
  return (
    <div className="flex items-center justify-center gap-2">
      {SECTIONS.map((s, i) => (
        <span
          key={s.label}
          className={`h-2 rounded-full transition-all ${
            i === activeIndex ? 'w-6 bg-brand-600 dark:bg-brand-400' : 'w-2 bg-slate-300 dark:bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <h1 className="text-2xl font-bold">Bienvenue dans Banque Familiale 👋</h1>
      <p className="text-slate-600 dark:text-slate-400">
        En quelques étapes, on va configurer ensemble ta famille — devise, enfants, argent de poche,
        taux d'intérêt et notifications — pour qu'elle soit prête à l'emploi.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
      >
        C'est parti
      </button>
    </StepShell>
  );
}

function CurrencyStep({ onNext }: { onNext: () => void }) {
  const settings = useSettings();
  const updateCurrency = useUpdateCurrency();
  const [selected, setSelected] = useState<string | null>(null);

  if (!settings.data) return null;
  const currentValue = selected ?? settings.data.currency;

  function onSubmit() {
    if (currentValue === settings.data!.currency) return onNext();
    updateCurrency.mutate(
      { currency: currentValue as (typeof SUPPORTED_CURRENCIES)[number]['code'] },
      { onSuccess: onNext },
    );
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Devise de la famille</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Utilisée pour l'affichage des montants. Modifiable à tout moment depuis les Paramètres.
      </p>
      <select
        value={currentValue}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onSubmit}
        disabled={updateCurrency.isPending}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {updateCurrency.isPending ? 'Enregistrement…' : 'Suivant'}
      </button>
    </StepShell>
  );
}

const childFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(50),
  pin: z.string().regex(/^\d{4}$/, 'Le code doit contenir 4 chiffres'),
});
type ChildFormValues = z.infer<typeof childFormSchema>;

function AddChildStep({ isFirst, onNext }: { isFirst: boolean; onNext: (childUserId: string) => void }) {
  const addMember = useAddMember();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChildFormValues>({ resolver: zodResolver(childFormSchema) });

  function onSubmit(values: ChildFormValues) {
    addMember.mutate(
      { firstName: values.firstName, role: 'CHILD', pin: values.pin },
      { onSuccess: (created) => onNext(created.id) },
    );
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">{isFirst ? 'Ajoute ton premier enfant' : 'Ajoute un autre enfant'}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Chaque enfant a son propre compte, avec un code à 4 chiffres pour se connecter.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="firstName">
          Prénom
        </label>
        <input
          id="firstName"
          type="text"
          autoFocus
          {...register('firstName')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.firstName && <p className="text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>}

        <label className="text-sm font-medium" htmlFor="pin">
          Code PIN (4 chiffres)
        </label>
        <input
          id="pin"
          type="text"
          inputMode="numeric"
          maxLength={4}
          {...register('pin')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.pin && <p className="text-sm text-red-600 dark:text-red-400">{errors.pin.message}</p>}

        {addMember.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {addMember.error instanceof ApiError ? 'Vérifie les informations saisies.' : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={addMember.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {addMember.isPending ? 'Ajout…' : 'Suivant'}
        </button>
      </form>
    </StepShell>
  );
}

const allowanceFormSchema = z.object({ amountChf: z.coerce.number().min(0, 'Ne peut pas être négatif') });
type AllowanceFormValues = z.infer<typeof allowanceFormSchema>;

function AllowanceStep({
  accountId,
  childFirstName,
  onNext,
}: {
  accountId: string | null;
  childFirstName: string;
  onNext: () => void;
}) {
  const setAllowance = useSetWeeklyAllowance();
  const { register, handleSubmit } = useForm<AllowanceFormValues>({
    resolver: zodResolver(allowanceFormSchema),
    defaultValues: { amountChf: 0 },
  });

  function onSubmit(values: AllowanceFormValues) {
    if (!accountId) return onNext();
    setAllowance.mutate(
      { accountId, input: { amountCents: Math.round(values.amountChf * 100) } },
      { onSuccess: onNext },
    );
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Argent de poche de {childFirstName}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Un montant versé automatiquement chaque lundi. Laisse à 0 pour désactiver — modifiable à tout
        moment depuis les Paramètres.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="amountChf">
          Montant hebdomadaire ({STORAGE_CURRENCY})
        </label>
        <input
          id="amountChf"
          type="number"
          step="0.01"
          autoFocus
          {...register('amountChf')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          disabled={setAllowance.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {setAllowance.isPending ? 'Enregistrement…' : 'Suivant'}
        </button>
      </form>
    </StepShell>
  );
}

function MoreChildrenStep({ onAddAnother, onDone }: { onAddAnother: () => void; onDone: () => void }) {
  return (
    <StepShell>
      <h1 className="text-xl font-bold">Ajouter un autre enfant ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Tu peux configurer autant d'enfants que nécessaire — chacun avec son propre code et son
        propre argent de poche.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddAnother}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Oui, ajouter un enfant
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Non, continuer
        </button>
      </div>
    </StepShell>
  );
}

function AddParentsStep({ onNext }: { onNext: () => void }) {
  const addMember = useAddMember();
  const [formOpen, setFormOpen] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BootstrapParentInput>({ resolver: zodResolver(bootstrapParentSchema) });

  function onSubmit(values: BootstrapParentInput) {
    addMember.mutate(
      { firstName: values.firstName, role: 'PARENT', password: values.password },
      {
        onSuccess: () => {
          setAddedCount((n) => n + 1);
          setFormOpen(false);
          reset();
        },
      },
    );
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Ajouter un autre parent ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Optionnel — un autre parent pourra se connecter avec son propre mot de passe. Tu pourras
        aussi en ajouter plus tard depuis les Paramètres.
      </p>

      {addedCount > 0 && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {addedCount} parent{addedCount > 1 ? 's' : ''} ajouté{addedCount > 1 ? 's' : ''}.
        </p>
      )}

      {!formOpen ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            + Ajouter un parent
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Continuer
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="parentFirstName">
            Prénom
          </label>
          <input
            id="parentFirstName"
            type="text"
            autoFocus
            {...register('firstName')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          {errors.firstName && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
          )}

          <label className="text-sm font-medium" htmlFor="parentPassword">
            Mot de passe
          </label>
          <input
            id="parentPassword"
            type="password"
            {...register('password')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          {errors.password && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}

          {addMember.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {addMember.error instanceof ApiError ? 'Vérifie les informations saisies.' : 'Une erreur est survenue.'}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addMember.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {addMember.isPending ? 'Ajout…' : 'Ajouter ce parent'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </StepShell>
  );
}

const interestFormSchema = z.object({
  ratePercent: z.coerce.number().min(0, 'Ne peut pas être négatif').max(100, 'Maximum 100%'),
});
type InterestFormValues = z.infer<typeof interestFormSchema>;

function InterestStep({ onNext }: { onNext: () => void }) {
  const settings = useSettings();
  const updateRate = useUpdateInterestRate();
  const { register, handleSubmit } = useForm<InterestFormValues>({ resolver: zodResolver(interestFormSchema) });

  function onSubmit(values: InterestFormValues) {
    updateRate.mutate({ rateBps: Math.round(values.ratePercent * 100) }, { onSuccess: onNext });
  }

  if (!settings.data) return null;
  const currentPercent = (settings.data.defaultInterestRateBps / 100).toFixed(2);

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Taux d'intérêt annuel</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Un seul taux pour toute la famille, versé automatiquement en 12 fois, à la fin de chaque
        mois — comme une vraie épargne.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="ratePercent">
          Taux annuel (%)
        </label>
        <input
          id="ratePercent"
          type="number"
          step="0.01"
          defaultValue={currentPercent}
          autoFocus
          {...register('ratePercent')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          disabled={updateRate.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {updateRate.isPending ? 'Enregistrement…' : 'Suivant'}
        </button>
      </form>
    </StepShell>
  );
}

function PushStep({ onNext }: { onNext: () => void }) {
  const push = usePushSubscription();

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Active les notifications</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Reçois une alerte sur cet appareil dès qu'un enfant fait une demande — même quand
        l'application est fermée. Modifiable à tout moment depuis les Paramètres.
      </p>
      <div className="flex flex-col gap-3">
        {(push.state === 'unsubscribed' || push.state === 'subscribed') && (
          <button
            type="button"
            onClick={() => (push.state === 'subscribed' ? undefined : push.subscribe())}
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            {push.state === 'subscribed' ? '✅ Notifications activées' : '🔔 Activer sur cet appareil'}
          </button>
        )}
        {push.state === 'denied' && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Notifications bloquées — tu pourras les autoriser plus tard dans les réglages du navigateur.
          </p>
        )}
        {push.state === 'unsupported' && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Ton navigateur ne supporte pas les notifications push.
          </p>
        )}
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Suivant
        </button>
      </div>
    </StepShell>
  );
}

function DoneStep({ onFinish, isPending }: { onFinish: () => void; isPending: boolean }) {
  return (
    <StepShell>
      <h1 className="text-2xl font-bold">Tout est prêt ! 🎉</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Ta famille est configurée. Tu peux dès maintenant suivre les comptes, ajouter d'autres
        membres et gérer l'argent de poche depuis le tableau de bord.
      </p>
      <button
        type="button"
        onClick={onFinish}
        disabled={isPending}
        className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? 'Un instant…' : 'Aller au tableau de bord'}
      </button>
    </StepShell>
  );
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('welcome');
  const [childUserId, setChildUserId] = useState<string | null>(null);
  const [childCount, setChildCount] = useState(0);
  const overview = useParentOverview(phase === 'allowance');
  const completeOnboarding = useCompleteOnboarding();

  const child = overview.data?.children.find((c) => c.userId === childUserId);
  const childAccountId = child?.accountId ?? null;
  const childFirstName = child?.firstName ?? '';

  function finish() {
    completeOnboarding.mutate(undefined, { onSuccess: () => navigate('/dashboard', { replace: true }) });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-10">
      <ProgressDots phase={phase} />
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {phase === 'welcome' && <WelcomeStep onNext={() => setPhase('currency')} />}
          {phase === 'currency' && <CurrencyStep onNext={() => setPhase('child')} />}
          {phase === 'child' && (
            <AddChildStep
              isFirst={childCount === 0}
              onNext={(id) => {
                setChildUserId(id);
                setChildCount((n) => n + 1);
                setPhase('allowance');
              }}
            />
          )}
          {phase === 'allowance' && (
            <AllowanceStep
              accountId={childAccountId}
              childFirstName={childFirstName}
              onNext={() => setPhase('moreChildren')}
            />
          )}
          {phase === 'moreChildren' && (
            <MoreChildrenStep onAddAnother={() => setPhase('child')} onDone={() => setPhase('parents')} />
          )}
          {phase === 'parents' && <AddParentsStep onNext={() => setPhase('interest')} />}
          {phase === 'interest' && <InterestStep onNext={() => setPhase('push')} />}
          {phase === 'push' && <PushStep onNext={() => setPhase('done')} />}
          {phase === 'done' && <DoneStep onFinish={finish} isPending={completeOnboarding.isPending} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
