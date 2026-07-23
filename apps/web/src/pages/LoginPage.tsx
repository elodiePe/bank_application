import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FamilyMemberSummary } from '@banque-familiale/shared';
import { bootstrapParentSchema } from '@banque-familiale/shared';
import { fetchFamilyMembers, loginWithPassword, loginWithPin } from '../services/auth.service.js';
import { bootstrapParent } from '../services/member.service.js';
import { ApiError } from '../services/api.js';
import { useInvalidateCurrentUser } from '../hooks/useAuth.js';
import { useLogoutFamily } from '../hooks/useFamilyAuth.js';
import { useRequestMemberPasswordReset, useRequestPinResetNotification } from '../hooks/useMembers.js';
import { PinPad } from '../components/PinPad.js';

const passwordFormSchema = z.object({
  password: z.string().min(1, 'Le mot de passe est requis'),
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

type BootstrapFormValues = z.infer<typeof bootstrapParentSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIAL: 'Identifiant incorrect.',
  LOCKED: 'Compte verrouillé après plusieurs échecs. Réessayez dans 15 minutes.',
  NOT_FOUND: 'Compte introuvable.',
  WRONG_ROLE: 'Ce mode de connexion ne correspond pas à ce compte.',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives, réessayez plus tard.',
  DEACTIVATED: 'Ce compte a été désactivé.',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? 'Une erreur est survenue.';
  }
  return 'Une erreur est survenue.';
}

function initials(firstName: string): string {
  return firstName.slice(0, 1).toUpperCase();
}

export function LoginPage() {
  const navigate = useNavigate();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const logoutFamily = useLogoutFamily();
  const [selected, setSelected] = useState<FamilyMemberSummary | null>(null);
  const [pin, setPin] = useState('');

  const membersQuery = useQuery({ queryKey: ['auth', 'members'], queryFn: fetchFamilyMembers });

  async function onLoginSuccess() {
    await invalidateCurrentUser();
    navigate('/dashboard', { replace: true });
  }

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      loginWithPassword({ userId: selected!.id, password: values.password }),
    onSuccess: onLoginSuccess,
  });

  const pinMutation = useMutation({
    mutationFn: (value: string) => loginWithPin({ userId: selected!.id, pin: value }),
    onSuccess: onLoginSuccess,
    onError: () => setPin(''),
  });

  const requestPasswordReset = useRequestMemberPasswordReset();
  const requestPinResetNotification = useRequestPinResetNotification();

  const bootstrapMutation = useMutation({
    mutationFn: async (values: BootstrapFormValues) => {
      const created = await bootstrapParent(values);
      await loginWithPassword({ userId: created.id, password: values.password });
    },
    onSuccess: onLoginSuccess,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordFormSchema) });

  const {
    register: registerBootstrap,
    handleSubmit: handleBootstrapSubmit,
    formState: { errors: bootstrapErrors },
  } = useForm<BootstrapFormValues>({ resolver: zodResolver(bootstrapParentSchema) });

  function selectMember(member: FamilyMemberSummary | null) {
    setSelected(member);
    setPin('');
    requestPasswordReset.reset();
    requestPinResetNotification.reset();
  }

  function handlePinChange(value: string) {
    setPin(value);
    if (value.length === 4) {
      pinMutation.mutate(value);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6">
      {!selected && (
        <button
          type="button"
          onClick={() => logoutFamily.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })}
          disabled={logoutFamily.isPending}
          className="absolute right-4 top-4 text-xs text-slate-400 hover:text-red-600 hover:underline disabled:opacity-60 dark:text-slate-500 dark:hover:text-red-400"
        >
          Se déconnecter
        </button>
      )}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Banque Familiale</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {selected ? `Bonjour ${selected.firstName}` : 'Qui se connecte ?'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selected && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-3 gap-4"
          >
            {membersQuery.isLoading && <p className="col-span-3 text-center">Chargement…</p>}
            {membersQuery.isError && (
              <p className="col-span-3 text-center text-red-600 dark:text-red-400">
                Impossible de contacter le serveur.
              </p>
            )}
            {membersQuery.data?.length === 0 && (
              <form
                onSubmit={handleBootstrapSubmit((values) => bootstrapMutation.mutate(values))}
                className="col-span-3 flex w-full flex-col gap-3 text-left"
              >
                <div>
                  <p className="text-sm font-medium">Créez votre premier compte parent</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Votre famille est prête, il ne manque plus qu'un parent pour commencer.
                  </p>
                </div>
                <label className="text-sm font-medium" htmlFor="bootstrap-firstName">
                  Votre prénom
                </label>
                <input
                  id="bootstrap-firstName"
                  type="text"
                  autoFocus
                  {...registerBootstrap('firstName')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
                {bootstrapErrors.firstName && (
                  <p className="text-sm text-red-600 dark:text-red-400">{bootstrapErrors.firstName.message}</p>
                )}
                <label className="text-sm font-medium" htmlFor="bootstrap-password">
                  Mot de passe
                </label>
                <input
                  id="bootstrap-password"
                  type="password"
                  {...registerBootstrap('password')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
                {bootstrapErrors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">{bootstrapErrors.password.message}</p>
                )}
                {bootstrapMutation.isError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(bootstrapMutation.error)}</p>
                )}
                <button
                  type="submit"
                  disabled={bootstrapMutation.isPending}
                  className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {bootstrapMutation.isPending ? 'Création…' : 'Créer mon compte'}
                </button>
              </form>
            )}
            {membersQuery.data?.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => selectMember(member)}
                className="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-xl font-semibold text-white">
                  {initials(member.firstName)}
                </span>
                <span className="text-sm font-medium">{member.firstName}</span>
              </button>
            ))}
          </motion.div>
        )}

        {selected && selected.role === 'CHILD' && (
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-4"
          >
            <PinPad value={pin} onChange={handlePinChange} disabled={pinMutation.isPending} />
            {pinMutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorMessage(pinMutation.error)}
              </p>
            )}

            {requestPinResetNotification.isSuccess ? (
              <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
                Les parents ont été prévenus, ils peuvent réinitialiser ton code.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => requestPinResetNotification.mutate(selected.id)}
                disabled={requestPinResetNotification.isPending}
                className="text-sm text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
              >
                {requestPinResetNotification.isPending ? 'Envoi…' : 'Code oublié ?'}
              </button>
            )}
            {requestPinResetNotification.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">Une erreur est survenue.</p>
            )}

            <button
              type="button"
              onClick={() => selectMember(null)}
              className="text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              ← Changer de compte
            </button>
          </motion.div>
        )}

        {selected && selected.role === 'PARENT' && (
          <motion.form
            key="password"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit((values) => passwordMutation.mutate(values))}
            className="flex w-full flex-col gap-3"
          >
            <label className="text-sm font-medium" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              {...register('password')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
            {errors.password && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
            {passwordMutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorMessage(passwordMutation.error)}
              </p>
            )}

            {requestPasswordReset.isSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Si une adresse e-mail est enregistrée, un lien de réinitialisation vient d'être envoyé.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => requestPasswordReset.mutate(selected.id)}
                disabled={requestPasswordReset.isPending}
                className="self-end text-sm text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
              >
                {requestPasswordReset.isPending ? 'Envoi…' : 'Mot de passe oublié ?'}
              </button>
            )}
            {requestPasswordReset.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {requestPasswordReset.error instanceof ApiError && requestPasswordReset.error.code === 'INVALID_INPUT'
                  ? "Aucune adresse e-mail n'est enregistrée pour ce compte. Demande à un autre parent de réinitialiser ton mot de passe."
                  : 'Une erreur est survenue.'}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {passwordMutation.isPending ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={() => selectMember(null)}
              className="text-sm text-slate-500 hover:underline dark:text-slate-400"
            >
              ← Changer de compte
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
