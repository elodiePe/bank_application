import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addMemberSchema, type AddMemberInput } from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useAddMember } from '../hooks/useMembers.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: 'Vérifie les informations saisies.',
};

interface AddMemberModalProps {
  onClose: () => void;
}

export function AddMemberModal({ onClose }: AddMemberModalProps) {
  const [role, setRole] = useState<'PARENT' | 'CHILD'>('CHILD');
  const addMember = useAddMember();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMemberInput>({ resolver: zodResolver(addMemberSchema), defaultValues: { role: 'CHILD' } });

  function onSubmit(values: AddMemberInput) {
    addMember.mutate(values, { onSuccess: onClose });
  }

  return (
    <Modal open onClose={onClose} title="Ajouter un membre de la famille">
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
        {errors.firstName && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
        )}

        <label className="text-sm font-medium" htmlFor="role">
          Rôle
        </label>
        <select
          id="role"
          {...register('role', { onChange: (e) => setRole(e.target.value as 'PARENT' | 'CHILD') })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="CHILD">Enfant</option>
          <option value="PARENT">Parent</option>
        </select>

        {role === 'PARENT' ? (
          <>
            <label className="text-sm font-medium" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.password && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </>
        ) : (
          <>
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
          </>
        )}

        {addMember.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {addMember.error instanceof ApiError
              ? (ERROR_MESSAGES[addMember.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={addMember.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {addMember.isPending ? 'Ajout…' : 'Ajouter'}
        </button>
      </form>
    </Modal>
  );
}
