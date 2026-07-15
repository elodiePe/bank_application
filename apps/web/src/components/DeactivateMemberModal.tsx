import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deactivateMemberSchema, type DeactivateMemberInput } from '@banque-familiale/shared';
import { Modal } from './Modal.js';
import { useDeactivateMember } from '../hooks/useMembers.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "L'adresse e-mail ne correspond pas, ou cette action n'est pas autorisée.",
};

interface DeactivateMemberModalProps {
  memberId: string;
  memberFirstName: string;
  onClose: () => void;
}

export function DeactivateMemberModal({ memberId, memberFirstName, onClose }: DeactivateMemberModalProps) {
  const deactivateMember = useDeactivateMember();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeactivateMemberInput>({ resolver: zodResolver(deactivateMemberSchema) });

  function onSubmit(values: DeactivateMemberInput) {
    deactivateMember.mutate({ memberId, input: values }, { onSuccess: onClose });
  }

  return (
    <Modal open onClose={onClose} title={`Désactiver le compte de ${memberFirstName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {memberFirstName} ne pourra plus se connecter, mais tout son historique reste conservé. Pour
          confirmer, saisis ta propre adresse e-mail.
        </p>
        <label className="text-sm font-medium" htmlFor="confirmEmail">
          Ton e-mail
        </label>
        <input
          id="confirmEmail"
          type="email"
          autoFocus
          {...register('confirmEmail')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
        />
        {errors.confirmEmail && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.confirmEmail.message}</p>
        )}

        {deactivateMember.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {deactivateMember.error instanceof ApiError
              ? (ERROR_MESSAGES[deactivateMember.error.code] ?? 'Une erreur est survenue.')
              : 'Une erreur est survenue.'}
          </p>
        )}

        <button
          type="submit"
          disabled={deactivateMember.isPending}
          className="mt-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deactivateMember.isPending ? 'Désactivation…' : 'Désactiver ce compte'}
        </button>
      </form>
    </Modal>
  );
}
