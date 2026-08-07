import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { contactMessageSchema, type ContactMessageInput } from '@banque-familiale/shared';
import { useSendContactMessage } from '../hooks/useContact.js';
import { ApiError } from '../services/api.js';

export function ContactPage() {
  const sendMessage = useSendContactMessage();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactMessageInput>({ resolver: zodResolver(contactMessageSchema) });

  if (sendMessage.isSuccess) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">FamilyApp</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Merci, ton message a bien été envoyé — on te répond dès que possible.
        </p>
        <Link to="/" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
          ← Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">FamilyApp</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nous contacter</p>
      </div>

      <form
        onSubmit={handleSubmit((values) => sendMessage.mutate(values))}
        className="flex w-full flex-col gap-3"
      >
        <label className="text-sm font-medium" htmlFor="name">
          Ton prénom (optionnel)
        </label>
        <input
          id="name"
          type="text"
          autoFocus
          {...register('name')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />

        <label className="text-sm font-medium" htmlFor="email">
          Ton e-mail
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        {errors.email && <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}

        <label className="text-sm font-medium" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          {...register('message')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        {errors.message && <p className="text-sm text-red-600 dark:text-red-400">{errors.message.message}</p>}

        {sendMessage.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {sendMessage.error instanceof ApiError && sendMessage.error.code === 'TOO_MANY_ATTEMPTS'
              ? 'Trop de messages envoyés, réessaie plus tard.'
              : "Impossible d'envoyer le message pour le moment. Réessaie plus tard."}
          </p>
        )}

        <button
          type="submit"
          disabled={sendMessage.isPending}
          className="mt-2 rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {sendMessage.isPending ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>

      <Link to="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Retour à l'accueil
      </Link>
    </div>
  );
}
