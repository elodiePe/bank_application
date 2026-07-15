import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCurrentFamily } from '../hooks/useFamilyAuth.js';

const FEATURES = [
  {
    icon: '🏦',
    title: 'Un vrai compte par enfant',
    body: "Chaque enfant a son propre solde, son historique complet, et ne peut jamais le modifier lui-même — tout passe par un parent.",
  },
  {
    icon: '📈',
    title: 'Intérêts automatiques',
    body: 'Un taux annuel versé chaque mois, comme une vraie épargne — plus besoin de faire le calcul à la main.',
  },
  {
    icon: '💸',
    title: 'Argent de poche automatique',
    body: 'Configure un montant hebdomadaire par enfant : il est versé tout seul, chaque semaine.',
  },
  {
    icon: '🔔',
    title: 'Demandes et notifications',
    body: 'Les enfants demandent de l\'argent aux parents (ou entre eux), et tout le monde est notifié en temps réel.',
  },
  {
    icon: '🧾',
    title: 'Historique inviolable',
    body: 'Aucune transaction n\'est jamais supprimée. Une erreur se corrige par une contre-écriture, comme dans une vraie banque.',
  },
  {
    icon: '📱',
    title: 'Installable, hors ligne',
    body: 'Une vraie application : installable sur le téléphone, consultable même sans réseau, avec notifications push.',
  },
];

export function LandingPage() {
  const { data: family, isLoading } = useCurrentFamily();

  // Already logged into a family on this device — skip straight to the member picker.
  if (!isLoading && family) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="text-lg font-bold text-brand-600 dark:text-brand-400">Banque Familiale</span>
        <div className="flex gap-2">
          <Link
            to="/family-login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Se connecter
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Créer une famille
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            La banque de poche <span className="text-brand-600 dark:text-brand-400">de votre famille</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-400">
            Gérez l'argent de poche de vos enfants comme une vraie banque : comptes individuels,
            intérêts automatiques, demandes, notifications — et un historique que personne ne peut
            trafiquer.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-brand-700"
            >
              Créer votre famille
            </Link>
            <Link
              to="/family-login"
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              J'ai déjà un compte
            </Link>
          </div>
        </motion.section>

        <section className="mt-16 grid gap-4 sm:mt-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
            >
              <span className="text-2xl">{feature.icon}</span>
              <h2 className="mt-2 font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{feature.body}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-16 rounded-2xl bg-brand-600 p-8 text-center text-white sm:mt-24">
          <h2 className="text-2xl font-bold">Prêt à commencer ?</h2>
          <p className="mt-2 text-brand-100">
            Crée ta famille en une minute — un email et un mot de passe suffisent.
          </p>
          <Link
            to="/register"
            className="mt-5 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50"
          >
            Créer votre famille
          </Link>
        </section>
      </main>
    </div>
  );
}
