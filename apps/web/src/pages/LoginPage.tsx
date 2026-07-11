import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FamilyMemberSummary } from '@banque-familiale/shared';
import { fetchFamilyMembers, loginWithPassword, loginWithPin } from '../services/auth.service.js';
import { ApiError } from '../services/api.js';
import { useInvalidateCurrentUser } from '../hooks/useAuth.js';
import { PinPad } from '../components/PinPad.js';

const passwordFormSchema = z.object({
  password: z.string().min(1, 'Le mot de passe est requis'),
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIAL: 'Identifiant incorrect.',
  LOCKED: 'Compte verrouillé après plusieurs échecs. Réessayez dans 15 minutes.',
  NOT_FOUND: 'Compte introuvable.',
  WRONG_ROLE: 'Ce mode de connexion ne correspond pas à ce compte.',
  TOO_MANY_ATTEMPTS: 'Trop de tentatives, réessayez plus tard.',
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
  const [selected, setSelected] = useState<FamilyMemberSummary | null>(null);
  const [pin, setPin] = useState('');

  const membersQuery = useQuery({ queryKey: ['auth', 'members'], queryFn: fetchFamilyMembers });

  async function onLoginSuccess() {
    await invalidateCurrentUser();
    navigate('/', { replace: true });
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordFormSchema) });

  function handlePinChange(value: string) {
    setPin(value);
    if (value.length === 4) {
      pinMutation.mutate(value);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-6">
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
            {membersQuery.data?.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelected(member)}
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
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPin('');
              }}
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
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="mt-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {passwordMutation.isPending ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
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
