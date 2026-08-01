import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CHORE_RECURRENCE_LABELS,
  CHORE_REWARD_TYPE_LABELS,
  CHORE_TEMPLATES,
  createChoreSchema,
  type ChildBalanceSummary,
  type ChoreRewardType,
  type CreateChoreInput,
} from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { Select } from './Select.js';
import { useCreateChore } from '../hooks/useChores.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: 'Vérifie les informations saisies.',
};

interface AddChoreModalProps {
  children: ChildBalanceSummary[];
  onClose: () => void;
}

export function AddChoreModal({ children, onClose }: AddChoreModalProps) {
  const createChore = useCreateChore();
  const [rewardType, setRewardType] = useState<ChoreRewardType>('MONEY');
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateChoreInput>({
    resolver: zodResolver(createChoreSchema),
    defaultValues: {
      childUserId: children[0]?.userId ?? '',
      recurrence: 'DAILY',
      rewardType: 'MONEY',
      rewardCents: 50,
      requiresApproval: true,
    },
  });

  function onSubmit(values: CreateChoreInput) {
    createChore.mutate(values, { onSuccess: onClose });
  }

  function applyTemplate(template: (typeof CHORE_TEMPLATES)[number]) {
    setValue('title', template.title, { shouldValidate: true });
    setRewardType('MONEY');
    setValue('rewardType', 'MONEY', { shouldValidate: true });
    setValue('rewardCents', template.suggestedRewardCents, { shouldValidate: true });
  }

  function changeRewardType(type: ChoreRewardType) {
    setRewardType(type);
    setValue('rewardType', type, { shouldValidate: true });
  }

  return (
    <Modal open onClose={onClose} title="Ajouter une tâche">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <p className="text-sm font-medium">Modèles rapides</p>
        <div className="flex flex-wrap gap-2">
          {CHORE_TEMPLATES.map((template) => (
            <button
              key={template.title}
              type="button"
              onClick={() => applyTemplate(template)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/30"
            >
              {template.title}
            </button>
          ))}
        </div>

        <label className="text-sm font-medium" htmlFor="title">
          Titre
        </label>
        <input
          id="title"
          type="text"
          autoFocus
          {...register('title')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.title && <p className="text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}

        <label className="text-sm font-medium" htmlFor="childUserId">
          Enfant
        </label>
        <Controller
          name="childUserId"
          control={control}
          render={({ field }) => (
            <Select
              id="childUserId"
              value={field.value}
              onChange={field.onChange}
              options={children.map((c) => ({ value: c.userId, label: c.firstName }))}
            />
          )}
        />

        <label className="text-sm font-medium" htmlFor="recurrence">
          Fréquence
        </label>
        <Controller
          name="recurrence"
          control={control}
          render={({ field }) => (
            <Select
              id="recurrence"
              value={field.value}
              onChange={field.onChange}
              options={Object.entries(CHORE_RECURRENCE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          )}
        />

        <span className="text-sm font-medium">Récompense</span>
        <div className="flex gap-2">
          {(['MONEY', 'POINTS', 'NONE'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => changeRewardType(type)}
              className={
                rewardType === type
                  ? 'flex-1 rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white'
                  : 'flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
              }
            >
              {CHORE_REWARD_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {rewardType === 'MONEY' && (
          <>
            <label className="text-sm font-medium" htmlFor="rewardCents">
              Montant (centimes)
            </label>
            <input
              id="rewardCents"
              type="number"
              step="1"
              {...register('rewardCents', { valueAsNumber: true })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.rewardCents && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.rewardCents.message}</p>
            )}
          </>
        )}
        {rewardType === 'POINTS' && (
          <>
            <label className="text-sm font-medium" htmlFor="rewardPoints">
              Nombre de points
            </label>
            <input
              id="rewardPoints"
              type="number"
              step="1"
              {...register('rewardPoints', { valueAsNumber: true })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.rewardPoints && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.rewardPoints.message}</p>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked
            {...register('requiresApproval')}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
          />
          Nécessite une validation du parent
        </label>

        {createChore.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {createChore.error instanceof ApiError
              ? (ERROR_MESSAGES[createChore.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={createChore.isPending || children.length === 0}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {createChore.isPending ? 'Ajout…' : 'Ajouter'}
        </button>
      </form>
    </Modal>
  );
}
