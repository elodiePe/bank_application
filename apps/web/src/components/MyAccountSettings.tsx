import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  changePinSchema,
  setEmailSchema,
  type ChangePasswordInput,
  type ChangePinInput,
  type SetEmailInput,
} from '@banque-familiale/shared';
import { useCurrentUser } from '../hooks/useAuth.js';
import { useCurrentFamily } from '../hooks/useFamilyAuth.js';
import { useChangeOwnPassword, useChangeOwnPin, useSetOwnEmail } from '../hooks/useMembers.js';
import { ApiError } from '../services/api.js';

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: 'Mot de passe ou code PIN actuel incorrect.',
  CONFLICT: 'Cette adresse e-mail est déjà utilisée par un autre compte.',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code] ?? 'Une erreur est survenue.';
  return 'Une erreur est survenue.';
}

export function MyAccountSettings() {
  const { data: user } = useCurrentUser();
  const { data: family } = useCurrentFamily();
  if (!user) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-medium">Mon compte</h3>
      <div className="mt-3 flex flex-col gap-4">
        {user.role === 'PARENT' && (
          <EmailForm currentEmail={user.email} familyOwnerEmail={family?.ownerEmail ?? null} />
        )}
        {user.role === 'PARENT' && <PasswordForm />}
        {user.role === 'CHILD' && <PinForm />}
      </div>
    </div>
  );
}

function EmailForm({
  currentEmail,
  familyOwnerEmail,
}: {
  currentEmail: string | null;
  familyOwnerEmail: string | null;
}) {
  const setEmail = useSetOwnEmail();
  // Pre-fill with the family owner's email (the address used to create this family
  // account) when this parent hasn't set their own personal email yet.
  const defaultEmail = currentEmail ?? familyOwnerEmail ?? '';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetEmailInput>({
    resolver: zodResolver(setEmailSchema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <form onSubmit={handleSubmit((values) => setEmail.mutate(values))} className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="email">
        Adresse e-mail{' '}
        {/* <span className="font-normal text-slate-500 dark:text-slate-400">
          (requise pour désactiver un compte)
        </span> */}
      </label>
      <div className="flex items-center gap-2">
        <input
          id="email"
          type="email"
          {...register('email')}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          disabled={setEmail.isPending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
      {errors.email && <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
      {setEmail.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(setEmail.error)}</p>
      )}
      {setEmail.isSuccess && <p className="text-sm text-green-600 dark:text-green-400">E-mail enregistré.</p>}
    </form>
  );
}

function PasswordForm() {
  const [open, setOpen] = useState(false);
  const changePassword = useChangeOwnPassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  function onSubmit(values: ChangePasswordInput) {
    changePassword.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-brand-600 hover:underline dark:text-brand-400"
      >
        Changer mon mot de passe
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="currentPassword">
        Mot de passe actuel
      </label>
      <input
        id="currentPassword"
        type="password"
        autoFocus
        {...register('currentPassword')}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
      {errors.currentPassword && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.currentPassword.message}</p>
      )}

      <label className="text-sm font-medium" htmlFor="newPassword">
        Nouveau mot de passe
      </label>
      <input
        id="newPassword"
        type="password"
        {...register('newPassword')}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
      {errors.newPassword && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.newPassword.message}</p>
      )}

      {changePassword.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(changePassword.error)}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={changePassword.isPending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function PinForm() {
  const [open, setOpen] = useState(false);
  const changePin = useChangeOwnPin();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePinInput>({ resolver: zodResolver(changePinSchema) });

  function onSubmit(values: ChangePinInput) {
    changePin.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-brand-600 hover:underline dark:text-brand-400"
      >
        Changer mon code PIN
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="currentPin">
        Code PIN actuel
      </label>
      <input
        id="currentPin"
        type="text"
        inputMode="numeric"
        maxLength={4}
        autoFocus
        {...register('currentPin')}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
      {errors.currentPin && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.currentPin.message}</p>
      )}

      <label className="text-sm font-medium" htmlFor="newPin">
        Nouveau code PIN
      </label>
      <input
        id="newPin"
        type="text"
        inputMode="numeric"
        maxLength={4}
        {...register('newPin')}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
      {errors.newPin && <p className="text-sm text-red-600 dark:text-red-400">{errors.newPin.message}</p>}

      {changePin.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(changePin.error)}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={changePin.isPending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
