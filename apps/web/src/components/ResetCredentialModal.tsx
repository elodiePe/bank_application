import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPinSchema, type ResetPinInput } from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useResetMemberPin } from '../hooks/useMembers.js';
import { ApiError } from '../services/api.js';

interface ResetCredentialModalProps {
  memberId: string;
  memberFirstName: string;
  onClose: () => void;
}

export function ResetCredentialModal({ memberId, memberFirstName, onClose }: ResetCredentialModalProps) {
  const resetPin = useResetMemberPin();
  const pinForm = useForm<ResetPinInput>({ resolver: zodResolver(resetPinSchema) });

  function onSubmitPin(values: ResetPinInput) {
    resetPin.mutate({ memberId, input: values }, { onSuccess: onClose });
  }

  return (
    <Modal open onClose={onClose} title={`Nouveau code PIN — ${memberFirstName}`}>
      <form onSubmit={pinForm.handleSubmit(onSubmitPin)} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="newPin">
          Nouveau code PIN (4 chiffres)
        </label>
        <input
          id="newPin"
          type="text"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          {...pinForm.register('newPin')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {pinForm.formState.errors.newPin && (
          <p className="text-sm text-red-600 dark:text-red-400">{pinForm.formState.errors.newPin.message}</p>
        )}
        {resetPin.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {resetPin.error instanceof ApiError ? resetPin.error.code : 'Une erreur est survenue.'}
          </p>
        )}
        <button
          type="submit"
          disabled={resetPin.isPending}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {resetPin.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  );
}
