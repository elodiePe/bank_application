import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CHILD_INTERFACE_LEVELS,
  CHILD_INTERFACE_LEVEL_LABELS,
  CHORE_TEMPLATES,
  POINTS_REWARD_TEMPLATES,
  SUPPORTED_CURRENCIES,
  WEEKDAY_LABELS,
  bootstrapParentSchema,
  type BootstrapParentInput,
} from '@banque-familiale/shared';
import { useAddMember, useHouseholdRoster, useUpdateMemberPermissions } from '../hooks/useMembers.js';
import { useParentOverview, useCompleteOnboarding } from '../hooks/useDashboard.js';
import { useCreateChore } from '../hooks/useChores.js';
import { useCreatePointsReward } from '../hooks/usePointsRewards.js';
import { useSetMealPlanRotationOrder } from '../hooks/useMealPlan.js';
import { useCreateLaundryType } from '../hooks/useLaundry.js';
import {
  useSetWeeklyAllowance,
  useSettings,
  useUpdateCurrency,
  useUpdateFeatureFlags,
  useUpdateInterestRate,
} from '../hooks/useTransactionActions.js';
import { usePushSubscription, type PushSupportState } from '../pwa/usePushSubscription.js';
import { STORAGE_CURRENCY } from '../utils/currency.js';
import { FEATURE_TOGGLES, type FeatureFlags } from '../utils/featureFlags.js';
import { ApiError } from '../services/api.js';
import { Select } from '../components/Select.js';
import { PermissionCheckboxes } from '../components/PermissionCheckboxes.js';
import { GroupOrderEditor } from '../components/GroupOrderEditor.js';
import { NotificationPreferences } from '../components/NotificationPreferences.js';
import { FULL_PERMISSIONS, type PermissionValues } from '../utils/permissions.js';

type Phase =
  | 'welcome'
  | 'currency'
  | 'features'
  | 'child'
  | 'allowance'
  | 'chores'
  | 'pointsRewards'
  | 'moreChildren'
  | 'parents'
  | 'mealPlan'
  | 'laundry'
  | 'interest'
  | 'push'
  | 'notificationPrefs'
  | 'done';

const SECTIONS: { label: string; phases: Phase[] }[] = [
  { label: 'Bienvenue', phases: ['welcome'] },
  { label: 'Devise', phases: ['currency'] },
  { label: 'Sections', phases: ['features'] },
  { label: 'Enfants', phases: ['child', 'allowance', 'chores', 'pointsRewards', 'moreChildren'] },
  { label: 'Parents', phases: ['parents'] },
  { label: 'Maison', phases: ['mealPlan', 'laundry'] },
  { label: 'Réglages', phases: ['interest', 'push', 'notificationPrefs'] },
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
      <h1 className="text-2xl font-bold">Bienvenue dans FamilyApp 👋</h1>
      <p className="text-slate-600 dark:text-slate-400">
        En quelques étapes, on va configurer ensemble ta famille — devise, enfants, argent de poche,
        taux d'intérêt et notifications — pour qu'elle soit prête à l'emploi.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
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
      <Select
        value={currentValue}
        onChange={setSelected}
        options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={updateCurrency.isPending}
        className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {updateCurrency.isPending ? 'Enregistrement…' : 'Suivant'}
      </button>
    </StepShell>
  );
}

function FeaturesStep({ onNext }: { onNext: (flags: FeatureFlags) => void }) {
  const updateFeatureFlags = useUpdateFeatureFlags();
  const [flags, setFlags] = useState<FeatureFlags>({
    stocksEnabled: false,
    mealPlanEnabled: false,
    shoppingListEnabled: false,
    laundryEnabled: false,
  });

  function toggle(key: keyof FeatureFlags) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSubmit() {
    updateFeatureFlags.mutate(flags, { onSuccess: () => onNext(flags) });
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Quelles sections activer ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        L'argent de poche et les tâches sont toujours actifs. Le reste est optionnel — active ce
        qui t'intéresse, modifiable à tout moment depuis les Paramètres.
      </p>
      <div className="flex flex-col gap-2">
        {FEATURE_TOGGLES.map((toggleDef) => {
          const isOn = flags[toggleDef.key];
          return (
            <button
              key={toggleDef.key}
              type="button"
              onClick={() => toggle(toggleDef.key)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                isOn
                  ? 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
              }`}
            >
              <span aria-hidden className="text-xl">{toggleDef.icon}</span>
              <span className="flex-1">
                <span className="block font-medium">{toggleDef.label}</span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">{toggleDef.description}</span>
              </span>
              <span
                className={`h-6 w-11 shrink-0 rounded-full transition-colors ${isOn ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span
                  className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={updateFeatureFlags.isPending}
        className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {updateFeatureFlags.isPending ? 'Enregistrement…' : 'Suivant'}
      </button>
    </StepShell>
  );
}

const childFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(50),
  pin: z.string().regex(/^\d{4}$/, 'Le code doit contenir 4 chiffres'),
  interfaceLevel: z.enum(['YOUNG', 'MIDDLE', 'TEEN']),
});
type ChildFormValues = z.infer<typeof childFormSchema>;

function AddChildStep({ isFirst, onNext }: { isFirst: boolean; onNext: (childUserId: string) => void }) {
  const addMember = useAddMember();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: { interfaceLevel: 'MIDDLE' },
  });

  function onSubmit(values: ChildFormValues) {
    addMember.mutate(
      { firstName: values.firstName, role: 'CHILD', pin: values.pin, interfaceLevel: values.interfaceLevel },
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

        <label className="text-sm font-medium" htmlFor="interfaceLevel">
          Interface
        </label>
        <Controller
          name="interfaceLevel"
          control={control}
          render={({ field }) => (
            <Select
              id="interfaceLevel"
              value={field.value}
              onChange={field.onChange}
              options={CHILD_INTERFACE_LEVELS.map((level) => ({
                value: level,
                label: CHILD_INTERFACE_LEVEL_LABELS[level],
              }))}
            />
          )}
        />

        {addMember.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {addMember.error instanceof ApiError ? 'Vérifie les informations saisies.' : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={addMember.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
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
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {setAllowance.isPending ? 'Enregistrement…' : 'Suivant'}
        </button>
      </form>
    </StepShell>
  );
}

function ChoresStep({
  childUserId,
  childFirstName,
  onNext,
}: {
  childUserId: string | null;
  childFirstName: string;
  onNext: () => void;
}) {
  const createChore = useCreateChore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  async function onSubmit() {
    if (!childUserId || selected.size === 0) return onNext();
    setIsSubmitting(true);
    try {
      for (const template of CHORE_TEMPLATES) {
        if (!selected.has(template.title)) continue;
        await createChore.mutateAsync({
          childUserId,
          title: template.title,
          rewardType: 'MONEY',
          rewardCents: template.suggestedRewardCents,
          recurrence: 'DAILY',
        });
      }
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Des tâches pour {childFirstName} ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Optionnel — coche ce qui s'applique, chaque tâche cochée est ajoutée en quotidien avec une
        récompense suggérée. Modifiable à tout moment depuis les Paramètres.
      </p>
      <div className="flex flex-wrap gap-2">
        {CHORE_TEMPLATES.map((template) => {
          const isSelected = selected.has(template.title);
          return (
            <button
              key={template.title}
              type="button"
              onClick={() => toggle(template.title)}
              className={
                isSelected
                  ? 'rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30'
              }
            >
              {template.title}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Ajout…' : selected.size > 0 ? 'Ajouter et continuer' : 'Suivant'}
        </button>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onNext}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Passer
          </button>
        )}
      </div>
    </StepShell>
  );
}

function PointsRewardsStep({
  childUserId,
  childFirstName,
  onNext,
}: {
  childUserId: string | null;
  childFirstName: string;
  onNext: () => void;
}) {
  const createReward = useCreatePointsReward();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState<{ title: string; pointsRequired: number }[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function addCustom() {
    const points = Number(customPoints);
    if (!customTitle.trim() || !Number.isInteger(points) || points <= 0) return;
    setCustom((prev) => [...prev, { title: customTitle.trim(), pointsRequired: points }]);
    setCustomTitle('');
    setCustomPoints('');
  }

  function removeCustom(index: number) {
    setCustom((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit() {
    if (!childUserId || (selected.size === 0 && custom.length === 0)) return onNext();
    setIsSubmitting(true);
    try {
      for (const template of POINTS_REWARD_TEMPLATES) {
        if (!selected.has(template.title)) continue;
        await createReward.mutateAsync({
          childUserId,
          title: template.title,
          pointsRequired: template.pointsRequired,
        });
      }
      for (const reward of custom) {
        await createReward.mutateAsync({ childUserId, title: reward.title, pointsRequired: reward.pointsRequired });
      }
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasAny = selected.size > 0 || custom.length > 0;

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Récompenses en points pour {childFirstName} ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Optionnel — coche ce que tu veux proposer, ou invente les tiennes, {childFirstName} pourra
        les débloquer avec ses points de corvées. Modifiable à tout moment depuis Maison.
      </p>
      <div className="flex flex-wrap gap-2">
        {POINTS_REWARD_TEMPLATES.map((template) => {
          const isSelected = selected.has(template.title);
          return (
            <button
              key={template.title}
              type="button"
              onClick={() => toggle(template.title)}
              className={
                isSelected
                  ? 'rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30'
              }
            >
              {template.title} ({template.pointsRequired} pts)
            </button>
          );
        })}
      </div>

      {custom.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {custom.map((reward, index) => (
            <li
              key={`${reward.title}-${index}`}
              className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            >
              {reward.title} ({reward.pointsRequired} pts)
              <button
                type="button"
                onClick={() => removeCustom(index)}
                aria-label={`Retirer ${reward.title}`}
                className="text-amber-500 hover:text-amber-800 dark:hover:text-amber-200"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Ex. Choisir le dessert"
          className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <input
          type="number"
          min={1}
          step={1}
          value={customPoints}
          onChange={(e) => setCustomPoints(e.target.value)}
          placeholder="Points"
          className="w-24 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="button"
          onClick={addCustom}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          + Ajouter
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Ajout…' : hasAny ? 'Ajouter et continuer' : 'Suivant'}
        </button>
        {hasAny && (
          <button
            type="button"
            onClick={onNext}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Passer
          </button>
        )}
      </div>
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
          className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Oui, ajouter un enfant
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Non, continuer
        </button>
      </div>
    </StepShell>
  );
}

function AddParentsStep({ onNext }: { onNext: () => void }) {
  const addMember = useAddMember();
  const updatePermissions = useUpdateMemberPermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [pendingPermissionsFor, setPendingPermissionsFor] = useState<{ id: string; firstName: string } | null>(
    null,
  );
  const [permissions, setPermissions] = useState<PermissionValues>(FULL_PERMISSIONS);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BootstrapParentInput>({ resolver: zodResolver(bootstrapParentSchema) });

  function onSubmit(values: BootstrapParentInput) {
    addMember.mutate(
      { firstName: values.firstName, role: 'PARENT', pin: values.pin },
      {
        onSuccess: (created) => {
          setFormOpen(false);
          reset();
          setPermissions(FULL_PERMISSIONS);
          setPendingPermissionsFor({ id: created.id, firstName: created.firstName });
        },
      },
    );
  }

  function onValidatePermissions() {
    if (!pendingPermissionsFor) return;
    updatePermissions.mutate(
      { memberId: pendingPermissionsFor.id, input: permissions },
      {
        onSuccess: () => {
          setAddedCount((n) => n + 1);
          setPendingPermissionsFor(null);
        },
      },
    );
  }

  if (pendingPermissionsFor) {
    return (
      <StepShell>
        <h1 className="text-xl font-bold">Droits de {pendingPermissionsFor.firstName}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Choisis ce que {pendingPermissionsFor.firstName} peut faire dans l'application. Modifiable
          à tout moment depuis les Paramètres.
        </p>
        <PermissionCheckboxes value={permissions} onChange={setPermissions} disabled={updatePermissions.isPending} />
        <button
          type="button"
          onClick={onValidatePermissions}
          disabled={updatePermissions.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {updatePermissions.isPending ? 'Enregistrement…' : 'Valider ces droits'}
        </button>
      </StepShell>
    );
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Ajouter un autre parent ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Optionnel — un autre parent pourra se connecter avec son propre code PIN. Tu pourras
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
            className="rounded-full border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            + Ajouter un parent
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
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

          <label className="text-sm font-medium" htmlFor="parentPin">
            Code PIN (4 chiffres)
          </label>
          <input
            id="parentPin"
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

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addMember.isPending}
              className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
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

function MealPlanStep({ onNext }: { onNext: () => void }) {
  const members = useHouseholdRoster();
  const setRotationOrder = useSetMealPlanRotationOrder();
  const [groups, setGroups] = useState<string[][] | null>(null);

  const activeMembers = (members.data ?? []).filter((m) => m.isActive);
  const defaultGroups = activeMembers.map((m) => [m.id]);
  const currentGroups = groups ?? defaultGroups;

  if (!members.data) return null;

  function onSubmit() {
    if (currentGroups.length === 0) return onNext();
    setRotationOrder.mutate({ orderedGroups: currentGroups }, { onSuccess: onNext });
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Qui cuisine ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Un tour par personne a été préparé — retire quelqu'un, ou regroupe deux personnes pour
        qu'elles cuisinent ensemble à leur tour. Modifiable à tout moment depuis Maison.
      </p>
      <GroupOrderEditor members={activeMembers} groups={currentGroups} onChange={setGroups} />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={setRotationOrder.isPending}
          className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {setRotationOrder.isPending ? 'Enregistrement…' : 'Suivant'}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          Passer
        </button>
      </div>
    </StepShell>
  );
}

function LaundryStep({ onNext }: { onNext: () => void }) {
  const members = useHouseholdRoster();
  const createType = useCreateLaundryType();
  const [name, setName] = useState('Lessive');
  const [weekday, setWeekday] = useState('0');
  const [groups, setGroups] = useState<string[][] | null>(null);

  const activeMembers = (members.data ?? []).filter((m) => m.isActive);
  const defaultGroups = activeMembers.map((m) => [m.id]);
  const currentGroups = groups ?? defaultGroups;

  if (!members.data) return null;

  function onSubmit() {
    if (!name.trim() || currentGroups.length === 0) return onNext();
    createType.mutate(
      {
        name: name.trim(),
        mode: 'ROTATING',
        rotationGroups: currentGroups,
        scheduleType: 'WEEKLY',
        weekdays: [Number(weekday)],
      },
      { onSuccess: onNext },
    );
  }

  return (
    <StepShell>
      <h1 className="text-xl font-bold">Un type de linge pour démarrer ?</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Optionnel — un exemple pour commencer, chaque semaine. Tu pourras en ajouter d'autres et
        tout ajuster depuis Maison.
      </p>
      <label className="text-sm font-medium" htmlFor="laundry-name">
        Nom
      </label>
      <input
        id="laundry-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
      />
      <label className="text-sm font-medium" htmlFor="laundry-weekday">
        Jour de la semaine
      </label>
      <Select
        id="laundry-weekday"
        value={weekday}
        onChange={setWeekday}
        options={WEEKDAY_LABELS.map((label, i) => ({ value: String(i), label }))}
      />
      <GroupOrderEditor members={activeMembers} groups={currentGroups} onChange={setGroups} />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={createType.isPending}
          className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {createType.isPending ? 'Enregistrement…' : name.trim() ? 'Ajouter et continuer' : 'Suivant'}
        </button>
        {name.trim() && (
          <button
            type="button"
            onClick={onNext}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Passer
          </button>
        )}
      </div>
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
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {updateRate.isPending ? 'Enregistrement…' : 'Suivant'}
        </button>
      </form>
    </StepShell>
  );
}

function NotificationPrefsStep({
  pushState,
  onNext,
}: {
  pushState: PushSupportState;
  onNext: () => void;
}) {
  return (
    <StepShell>
      <h1 className="text-xl font-bold">Tes notifications</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Tout est activé par défaut — décoche ce que tu ne veux pas recevoir. Modifiable à tout
        moment depuis les Paramètres.
      </p>
      <NotificationPreferences pushState={pushState} />
      <button
        type="button"
        onClick={onNext}
        className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
      >
        Suivant
      </button>
    </StepShell>
  );
}

function PushStep({ push, onNext }: { push: ReturnType<typeof usePushSubscription>; onNext: () => void }) {
  const [isSubscribing, setIsSubscribing] = useState(false);

  async function onActivate() {
    setIsSubscribing(true);
    try {
      await push.subscribe();
      onNext();
    } finally {
      setIsSubscribing(false);
    }
  }

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
            onClick={() => (push.state === 'subscribed' ? onNext() : onActivate())}
            disabled={isSubscribing}
            className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {push.state === 'subscribed'
              ? '✅ Notifications activées'
              : isSubscribing
                ? 'Activation…'
                : '🔔 Activer sur cet appareil'}
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
          className="rounded-full border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
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
        className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? 'Un instant…' : 'Aller au tableau de bord'}
      </button>
    </StepShell>
  );
}

const ONBOARDING_STORAGE_KEY = 'onboarding-wizard-progress';

type OnboardingProgress = {
  phase: Phase;
  history: Phase[];
  childUserId: string | null;
  childCount: number;
  featureFlags: FeatureFlags;
};

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  stocksEnabled: false,
  mealPlanEnabled: false,
  shoppingListEnabled: false,
  laundryEnabled: false,
};

function loadOnboardingProgress(): OnboardingProgress | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProgress) : null;
  } catch {
    return null;
  }
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  // Resuming mid-onboarding after e.g. a browser-back into the login screen (and back in) must
  // not restart from scratch — that previously re-ran AddChildStep and created a duplicate
  // child. Progress is restored from localStorage on mount instead of always starting at
  // 'welcome'.
  const [phase, setPhaseRaw] = useState<Phase>(() => loadOnboardingProgress()?.phase ?? 'welcome');
  const [history, setHistory] = useState<Phase[]>(() => loadOnboardingProgress()?.history ?? []);
  const [childUserId, setChildUserId] = useState<string | null>(() => loadOnboardingProgress()?.childUserId ?? null);
  const [childCount, setChildCount] = useState(() => loadOnboardingProgress()?.childCount ?? 0);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(
    () => loadOnboardingProgress()?.featureFlags ?? DEFAULT_FEATURE_FLAGS,
  );
  const overview = useParentOverview(phase === 'allowance');
  const completeOnboarding = useCompleteOnboarding();
  const push = usePushSubscription();

  useEffect(() => {
    const progress: OnboardingProgress = { phase, history, childUserId, childCount, featureFlags };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
  }, [phase, history, childUserId, childCount, featureFlags]);

  function goTo(next: Phase) {
    setHistory((h) => [...h, phase]);
    setPhaseRaw(next);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      setPhaseRaw(h[h.length - 1]!);
      return h.slice(0, -1);
    });
  }

  const child = overview.data?.children.find((c) => c.userId === childUserId);
  const childAccountId = child?.accountId ?? null;
  const childFirstName = child?.firstName ?? '';

  function finish() {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        navigate('/dashboard', { replace: true });
      },
    });
  }

  function afterParents() {
    if (featureFlags.mealPlanEnabled) return goTo('mealPlan');
    if (featureFlags.laundryEnabled) return goTo('laundry');
    return goTo('interest');
  }

  function afterMealPlan() {
    if (featureFlags.laundryEnabled) return goTo('laundry');
    return goTo('interest');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-10">
      <ProgressDots phase={phase} />
      {history.length > 0 && phase !== 'done' && (
        <button
          type="button"
          onClick={goBack}
          className="-mb-4 self-start text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← Retour
        </button>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {phase === 'welcome' && <WelcomeStep onNext={() => goTo('currency')} />}
          {phase === 'currency' && <CurrencyStep onNext={() => goTo('features')} />}
          {phase === 'features' && (
            <FeaturesStep
              onNext={(flags) => {
                setFeatureFlags(flags);
                goTo('child');
              }}
            />
          )}
          {phase === 'child' && (
            <AddChildStep
              isFirst={childCount === 0}
              onNext={(id) => {
                setChildUserId(id);
                setChildCount((n) => n + 1);
                goTo('allowance');
              }}
            />
          )}
          {phase === 'allowance' && (
            <AllowanceStep
              accountId={childAccountId}
              childFirstName={childFirstName}
              onNext={() => goTo('chores')}
            />
          )}
          {phase === 'chores' && (
            <ChoresStep
              childUserId={childUserId}
              childFirstName={childFirstName}
              onNext={() => goTo('pointsRewards')}
            />
          )}
          {phase === 'pointsRewards' && (
            <PointsRewardsStep
              childUserId={childUserId}
              childFirstName={childFirstName}
              onNext={() => goTo('moreChildren')}
            />
          )}
          {phase === 'moreChildren' && (
            <MoreChildrenStep onAddAnother={() => goTo('child')} onDone={() => goTo('parents')} />
          )}
          {phase === 'parents' && <AddParentsStep onNext={afterParents} />}
          {phase === 'mealPlan' && <MealPlanStep onNext={afterMealPlan} />}
          {phase === 'laundry' && <LaundryStep onNext={() => goTo('interest')} />}
          {phase === 'interest' && <InterestStep onNext={() => goTo('push')} />}
          {phase === 'push' && <PushStep push={push} onNext={() => goTo('notificationPrefs')} />}
          {phase === 'notificationPrefs' && (
            <NotificationPrefsStep pushState={push.state} onNext={() => goTo('done')} />
          )}
          {phase === 'done' && <DoneStep onFinish={finish} isPending={completeOnboarding.isPending} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
