import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  addMemberSchema,
  CHILD_INTERFACE_LEVELS,
  CHILD_INTERFACE_LEVEL_LABELS,
  type AddMemberInput,
} from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { Select } from './Select.js';
import { PermissionCheckboxes } from './PermissionCheckboxes.js';
import { FULL_PERMISSIONS, type PermissionValues } from '../utils/permissions.js';
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
  const [permissions, setPermissions] = useState<PermissionValues>(FULL_PERMISSIONS);
  const addMember = useAddMember();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { role: 'CHILD', interfaceLevel: 'MIDDLE' },
  });

  function onSubmit(values: AddMemberInput) {
    addMember.mutate(
      { ...values, ...(role === 'PARENT' ? permissions : {}) },
      { onSuccess: onClose },
    );
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
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              id="role"
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                setRole(v as 'PARENT' | 'CHILD');
              }}
              options={[
                { value: 'CHILD', label: 'Enfant' },
                { value: 'PARENT', label: 'Parent' },
              ]}
            />
          )}
        />

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

        {role === 'CHILD' && (
          <>
            <label className="text-sm font-medium" htmlFor="interfaceLevel">
              Interface
            </label>
            <Controller
              name="interfaceLevel"
              control={control}
              render={({ field }) => (
                <Select
                  id="interfaceLevel"
                  value={field.value ?? 'MIDDLE'}
                  onChange={field.onChange}
                  options={CHILD_INTERFACE_LEVELS.map((level) => ({
                    value: level,
                    label: CHILD_INTERFACE_LEVEL_LABELS[level],
                  }))}
                />
              )}
            />
          </>
        )}

        {role === 'PARENT' && (
          <>
            <p className="text-sm font-medium">Droits de ce parent</p>
            <PermissionCheckboxes value={permissions} onChange={setPermissions} />
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
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {addMember.isPending ? 'Ajout…' : 'Ajouter'}
        </button>
      </form>
    </Modal>
  );
}
