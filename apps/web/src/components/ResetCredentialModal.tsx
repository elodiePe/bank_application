import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  resetPasswordSchema,
  resetPinSchema,
  type ResetPasswordInput,
  type ResetPinInput,
} from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useResetMemberPassword, useResetMemberPin } from '../hooks/useMembers.js';
import { ApiError } from '../services/api.js';

interface ResetCredentialModalProps {
  memberId: string;
  memberFirstName: string;
  kind: 'password' | 'pin';
  onClose: () => void;
}

export function ResetCredentialModal({ memberId, memberFirstName, kind, onClose }: ResetCredentialModalProps) {
  const resetPassword = useResetMemberPassword();
  const resetPin = useResetMemberPin();
  const mutation = kind === 'password' ? resetPassword : resetPin;

  const passwordForm = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });
  const pinForm = useForm<ResetPinInput>({ resolver: zodResolver(resetPinSchema) });

  function onSubmitPassword(values: ResetPasswordInput) {
    resetPassword.mutate({ memberId, input: values }, { onSuccess: onClose });
  }
  function onSubmitPin(values: ResetPinInput) {
    resetPin.mutate({ memberId, input: values }, { onSuccess: onClose });
  }

  const title =
    kind === 'password' ? `Nouveau mot de passe — ${memberFirstName}` : `Nouveau code PIN — ${memberFirstName}`;

  return (
    <Modal open onClose={onClose} title={title}>
      {kind === 'password' ? (
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="newPassword">
            Nouveau mot de passe
          </label>
          <input
            id="newPassword"
            type="password"
            autoFocus
            {...passwordForm.register('newPassword')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          {passwordForm.formState.errors.newPassword && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {passwordForm.formState.errors.newPassword.message}
            </p>
          )}
          {mutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof ApiError ? mutation.error.code : 'Une erreur est survenue.'}
            </p>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      ) : (
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
          {mutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {mutation.error instanceof ApiError ? mutation.error.code : 'Une erreur est survenue.'}
            </p>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}
    </Modal>
  );
}
