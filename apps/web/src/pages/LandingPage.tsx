import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CHILD_INTERFACE_LEVELS, CHILD_INTERFACE_LEVEL_DESCRIPTIONS, CHILD_INTERFACE_LEVEL_LABELS } from '@banque-familiale/shared';
import { useCurrentFamily } from '../hooks/useFamilyAuth.js';
import {
  ChildCountingCoinsIllustration,
  FamilyWithAppIllustration,
  SavingsGrowthIllustration,
} from '../components/LandingIllustrations.js';
import { PhotoSlot } from '../components/PhotoSlot.js';

// Icons for the age-evolution section — kept separate from CHILD_INTERFACE_LEVEL_LABELS
// (which stay purely textual, used inside the app itself where emoji would look out of place).
const INTERFACE_LEVEL_ICONS: Record<(typeof CHILD_INTERFACE_LEVELS)[number], string> = {
  YOUNG: '🧸',
  MIDDLE: '🎒',
  TEEN: '🚀',
};

// The apps a family typically juggles today for these six things — used to make the
// "before" half of the problem/solution section concrete rather than abstract.
const JUGGLED_APPS = ['App bancaire enfant', 'Appli de tâches', 'Agenda repas', 'Liste de courses', 'Groupe WhatsApp'];

// The six most universal features, always visible. CORE.length stays independent from
// MORE_FEATURES so "Voir plus" can reveal the rest without touching this list.
const CORE_FEATURES = [
  {
    icon: '💶',
    title: 'Argent de poche automatique',
    body: 'Un versement hebdomadaire par enfant, un solde et un historique clairs. Plus de calcul ni d’oubli à gérer soi-même.',
  },
  {
    icon: '⭐',
    title: 'Corvées en argent ou en points',
    body: 'Chaque tâche accomplie rapporte de l’argent réel ou des points, selon ce que vous choisissez — validé par un parent en un geste.',
  },
  {
    icon: '🍽️',
    title: 'Planning des repas',
    body: 'Une rotation des cuisiniers de la semaine, visible par toute la famille, avec un rappel envoyé à la bonne personne le bon jour.',
  },
  {
    icon: '🧺',
    title: 'Ménage et lessive',
    body: 'Les tâches ménagères tournent automatiquement entre les membres de la famille, sans liste à refaire chaque semaine.',
  },
  {
    icon: '🛒',
    title: 'Liste de courses partagée',
    body: 'Toute la famille ajoute et coche les articles en temps réel, avant même d’arriver au magasin.',
  },
  {
    icon: '🔔',
    title: 'Demandes et notifications',
    body: 'Un enfant fait une demande à un parent — ou, dès le niveau Standard, directement à un frère ou une sœur. Chacun reçoit une notification au bon moment, rien ne se perd.',
  },
];

// Revealed by "Voir plus" — real features that don't need top billing but matter to a
// parent evaluating the app seriously, especially the financial-education angle.
const MORE_FEATURES = [
  {
    icon: '🧒',
    title: 'Une interface par âge',
    body: 'Très simplifié, Standard ou Avancé : chaque enfant a l’interface adaptée à son âge, réglable par les parents à tout moment.',
  },
  {
    icon: '📈',
    title: 'Portefeuille boursier pour les ados',
    body: 'Les ados peuvent investir une partie de leur argent dans de vraies actions, chaque ordre validé par un parent — une première initiation concrète à l’investissement.',
  },
  {
    icon: '🏦',
    title: 'Taux d’intérêt personnalisé',
    body: 'Fixez un taux d’intérêt mensuel sur l’épargne de vos enfants, versé automatiquement — pour qu’ils découvrent concrètement comment l’argent peut fructifier.',
  },
  {
    icon: '🎯',
    title: 'Objectifs d’épargne',
    body: 'Vélo, console, sorties entre amis : chaque enfant fixe son objectif et voit sa progression, centime par centime.',
  },
  {
    icon: '🛠️',
    title: 'Mode gestion pour les ados',
    body: 'Dès le niveau Avancé, l’ado peut modifier lui-même le planning des repas ou du ménage — une vraie prise de responsabilité, progressive.',
  },
  {
    icon: '📌',
    title: 'Rappels personnalisés',
    body: 'Créez vos propres rappels récurrents (sortir les poubelles, arroser les plantes…) en plus des sections automatiques de l’app.',
  },
  {
    icon: '📝',
    title: 'Tâches personnelles, pour toute la famille',
    body: 'Parents et enfants peuvent aussi se créer leurs propres tâches, en plus des corvées partagées — tout se retrouve au même endroit, pour tout le monde.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Sans smartphone pour l’enfant',
    body: 'Un parent peut gérer l’argent de poche, les corvées et la vie de famille d’un enfant entièrement depuis son propre téléphone — sans que l’enfant ait besoin d’un appareil. L’app grandit avec lui, du plus jeune âge à l’autonomie complète.',
  },
];

// Trust signals pulled from real, already-shipped work (RGPD/nLPD compliance pass, EU
// hosting) rather than invented testimonials — see PrivacyPolicyPage for the details.
const TRUST_BADGES = [
  { icon: '🔒', label: 'Données chiffrées en transit' },
  { icon: '🇪🇺', label: 'Hébergement européen' },
  { icon: '✅', label: 'Conforme RGPD et nLPD' },
];

// Pricing exactly as specified by the family running this app — billed once a year, and the
// two paid tiers unlock the same feature set (all sections); the only difference between them
// is the number-of-children cap. Keep this in sync with the enforcement logic once task #249
// (subscription tiers) is implemented — these numbers are the source of truth.
// annualPrice is the real charge; monthlyEquivalent is shown as the headline figure (common,
// expected SaaS convention) with the annual amount as a small caption underneath — never the
// other way round, so nobody is surprised by the real charge at checkout.
const PRICING = [
  {
    name: 'Essentiel',
    monthlyEquivalent: '0 CHF',
    annualPriceValue: 0,
    billingNote: 'Gratuit, sans limite de temps',
    description: 'Pour découvrir l’app avec un enfant, sans engagement.',
    features: ['1 enfant', 'Argent de poche et solde', 'Corvées et points'],
    cta: 'Commencer gratuitement',
    featured: false,
  },
  {
    name: 'Famille',
    monthlyEquivalent: '1 CHF',
    annualPriceValue: 12,
    billingNote: 'Facturé 12 CHF une fois par an',
    description: 'Toutes les sections activées, pour les familles jusqu’à 2 enfants.',
    features: ['Jusqu’à 2 enfants', 'Toutes les sections (repas, ménage, courses…)', 'Notifications illimitées'],
    cta: 'Choisir Famille',
    featured: true,
  },
  {
    name: 'Grande Famille',
    monthlyEquivalent: '2 CHF',
    annualPriceValue: 24,
    billingNote: 'Facturé 24 CHF une fois par an',
    description: 'Toutes les sections activées, sans limite d’enfants.',
    features: ['Enfants illimités', 'Toutes les sections incluses', 'Idéal pour les familles nombreuses'],
    cta: 'Choisir Grande Famille',
    featured: false,
  },
];

// Presented as honest, un-attributed value statements rather than testimonials — the app has
// no external users yet, so putting invented names/photos on these would be a fabricated
// review. Revisit once real family feedback exists (see PhotoSlot pattern for a similar
// "swap in the real thing later" approach).
const VALUE_QUOTES = [
  {
    icon: '💶',
    quote: 'Enfin un endroit où mes enfants voient clairement d’où vient leur argent de poche, et où il part.',
  },
  {
    icon: '🧹',
    quote: 'Les corvées ne sont plus une négociation sans fin — elles sont suivies, récompensées, et personne n’oublie qui fait quoi.',
  },
  {
    icon: '🎓',
    quote: 'Mon ado gère presque tout seul son argent de poche, avec juste ce qu’il faut de supervision.',
  },
  {
    icon: '🍽️',
    quote: 'Toute la famille voit le planning des repas et du ménage au même endroit — fini les post-it perdus.',
  },
];

const STEPS = [
  {
    title: '1. Créez votre famille',
    body: 'Un compte parent, un profil par enfant, et vos premières règles en quelques minutes.',
  },
  {
    title: '2. Activez ce dont vous avez besoin',
    body: 'Argent de poche, corvées, repas, ménage, courses — activez seulement les sections utiles à votre foyer.',
  },
  {
    title: '3. Suivez tout au même endroit',
    body: 'Argent, tâches, planning et demandes vivent dans une seule application, claire pour toute la famille.',
  },
];

const FAQ = [
  {
    question: 'Est-ce seulement une application d’argent de poche ?',
    answer: 'Non — l’argent de poche n’est qu’une des sections. L’app couvre aussi les corvées, le planning des repas, le ménage et les courses, pour fluidifier toute la vie de famille.',
  },
  {
    question: 'Combien d’enfants puis-je ajouter gratuitement ?',
    answer: 'Le plan Essentiel est gratuit pour 1 enfant, avec l’argent de poche et les corvées. Le plan Famille (1 CHF/mois, facturé 12 CHF une fois par an) débloque toutes les sections pour 2 enfants, et Grande Famille (2 CHF/mois, facturé 24 CHF une fois par an) retire la limite d’enfants.',
  },
  {
    question: 'Puis-je activer seulement certaines fonctionnalités ?',
    answer: 'Oui. Chaque section (repas, ménage, courses, actions boursières) s’active ou se désactive depuis les paramètres, selon les besoins de votre foyer.',
  },
  {
    question: 'Puis-je garder le contrôle en tant que parent ?',
    answer: 'Oui. Les enfants voient leur propre espace, mais les parents gardent la main sur les règles, les versements et les validations.',
  },
];

// FAQPage + SoftwareApplication structured data for search engines — built from the same
// content shown on the page, so the two never drift apart. Injected as JSON-LD rather than
// microdata since the markup above already has its own class/style shape to keep simple.
function buildStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'FamilyApp',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web, iOS, Android',
        url: 'https://app.unmatched.ch/',
        description:
          'Argent de poche, corvées, repas, ménage et courses : toute la vie de famille dans une seule app.',
        offers: PRICING.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          price: String(plan.annualPriceValue),
          priceCurrency: 'CHF',
          description: plan.description,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };
}

export function LandingPage() {
  const { data: family, isLoading } = useCurrentFamily();
  const [scrolled, setScrolled] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Gives the sticky header a subtle shadow/border once content has scrolled under it, so it
  // reads as "floating above the page" instead of blending into the hero on scroll. The same
  // scroll position also reveals a single centralized CTA bar on mobile (where the header
  // button has scrolled out of reach) — one obvious next action, always within thumb's reach.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
      setShowStickyCta(window.scrollY > 500);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Already logged into a family on this device — skip straight to the member picker.
  if (!isLoading && family) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Decorative background blobs — purely visual, behind everything, clipped so they never
          cause horizontal scroll. Gives the page a distinct identity instead of flat white. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden">
        <div className="absolute -left-40 -top-20 h-[420px] w-[420px] rounded-full bg-brand-200/50 blur-3xl dark:bg-brand-800/20" />
        <div className="absolute -right-32 top-40 h-[380px] w-[380px] rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-800/10" />
        <div className="absolute left-1/3 top-[520px] h-[320px] w-[320px] rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-800/10" />
      </div>

      {/* Content is our own static object, not user input, so injecting it as raw JSON is safe. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStructuredData()) }} />

      <header
        className={`sticky top-0 z-20 border-b bg-white/85 backdrop-blur-xl transition-shadow dark:bg-slate-950/85 ${
          scrolled ? 'border-slate-200 shadow-sm dark:border-slate-800' : 'border-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3 text-sm font-semibold tracking-wide">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
              F
            </span>
            FamilyApp
          </a>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-brand-600 dark:hover:text-brand-400">
              Fonctionnalités
            </a>
            <a href="#process" className="transition hover:text-brand-600 dark:hover:text-brand-400">
              Comment ça marche
            </a>
            <a href="#pricing" className="transition hover:text-brand-600 dark:hover:text-brand-400">
              Tarifs
            </a>
            <a href="#faq" className="transition hover:text-brand-600 dark:hover:text-brand-400">
              FAQ
            </a>
            <a href="#contact" className="transition hover:text-brand-600 dark:hover:text-brand-400">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/family-login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:text-brand-400"
            >
              Se connecter
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Aidez vos enfants à apprendre la valeur de l’argent
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Toute la vie de famille, enfin fluide.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300 sm:text-xl">
              Argent de poche, corvées, repas, ménage, courses : tout ce qui compte à la maison,
              dans un seul espace pensé pour que vos enfants apprennent à gérer leur argent —
              plus besoin de passer d’une app à l’autre.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Commencer gratuitement
              </Link>
              <a
                href="#pricing"
                className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:text-brand-400"
              >
                Voir les tarifs
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {TRUST_BADGES.map((badge) => (
                <span key={badge.label} className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{badge.icon}</span>
                  {badge.label}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { value: '1 min', label: 'pour créer une famille' },
                { value: '6', label: 'sections du quotidien réunies' },
                { value: '1 app', label: 'pour l’argent et la vie de famille' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.05 }}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="text-2xl font-semibold text-brand-600 dark:text-brand-400">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-200 to-amber-200 opacity-60 blur-2xl dark:from-brand-800/40 dark:to-amber-800/30" />
            {/* Real family photo (public/images/landing/hero-family.jpg), falling back to the
                drawn illustration until that photo exists — see the README next to it. */}
            <PhotoSlot
              basePath="/images/landing/hero-family"
              alt="Une famille heureuse qui utilise FamilyApp ensemble"
              className="mx-auto block aspect-[4/5] w-full max-w-sm rounded-[2rem] object-cover shadow-2xl"
              fallback={
                <div className="mx-auto max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-900">
                  <FamilyWithAppIllustration className="w-full" />
                </div>
              }
            />
          </motion.div>
        </section>

        {/* Problem → solution: lead with the harder, more personal problem (kids not really
            learning to manage money) before the practical one (juggling five apps) — the
            emotional hook a parent actually cares about, per user direction. */}
        <section className="mt-20 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mt-28 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-500 dark:text-rose-400">
                Le problème
              </p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                Comment apprendre à un enfant à gérer l’argent, sans y passer vos soirées ?
              </h2>
              <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
                Un carnet, une tirelire, un billet glissé en passant : sans un vrai suivi,
                difficile pour un enfant de comprendre d’où vient son argent, où il part, et ce
                que veut vraiment dire épargner. Et pendant ce temps, vous jonglez aussi entre :
              </p>
              <ul className="mt-5 space-y-2">
                {JUGGLED_APPS.map((app) => (
                  <li key={app} className="flex items-center gap-3 text-slate-500 line-through decoration-rose-400 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {app}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.5rem] bg-brand-50 p-6 dark:bg-brand-900/20">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600 dark:text-brand-400">
                La solution
              </p>
              <h3 className="mt-3 text-2xl font-semibold">Un vrai apprentissage, dans une seule app.</h3>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                FamilyApp donne à chaque enfant un espace pour voir son argent grandir,
                comprendre à quoi servent ses corvées, et apprendre à épargner — pendant que
                vous gérez le reste de la maison (repas, ménage, courses) au même endroit. Un
                seul mot de passe, une seule notification à surveiller.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 scroll-mt-28 sm:mt-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600 dark:text-brand-400">
              Fonctionnalités
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Une seule app pour l’argent, les corvées et l’organisation de la maison.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CORE_FEATURES.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800"
              >
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{feature.body}</p>
              </motion.article>
            ))}
            {showAllFeatures &&
              MORE_FEATURES.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800"
                >
                  <div className="text-3xl">{feature.icon}</div>
                  <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{feature.body}</p>
                </motion.article>
              ))}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllFeatures((v) => !v)}
              aria-expanded={showAllFeatures}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:text-brand-400"
            >
              {showAllFeatures ? 'Voir moins' : `Voir les ${MORE_FEATURES.length} autres fonctionnalités`}
            </button>
          </div>
        </section>

        {/* A key differentiator: the app isn't one fixed UI for every kid — it reshapes itself
            as they grow, and parents keep fine-grained control over who can do what. */}
        <section className="mt-20 scroll-mt-28 sm:mt-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-600 dark:text-violet-400">
              Une app qui grandit avec votre enfant
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Trois niveaux d’interface, un pour chaque âge — vous changez de niveau à tout moment.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Un enfant de 6 ans et un ado de 14 ans n’ont pas besoin des mêmes écrans. Chaque
              profil enfant a son propre niveau, réglable depuis les paramètres à mesure qu’il
              grandit.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CHILD_INTERFACE_LEVELS.map((level, index) => (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-3xl">{INTERFACE_LEVEL_ICONS[level]}</div>
                <h3 className="mt-4 text-xl font-semibold">{CHILD_INTERFACE_LEVEL_LABELS[level]}</h3>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                  {CHILD_INTERFACE_LEVEL_DESCRIPTIONS[level]}
                </p>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-violet-200 bg-violet-50 p-6 dark:border-violet-800 dark:bg-violet-900/20">
            <p className="leading-7 text-slate-700 dark:text-slate-200">
              <span className="font-semibold">Les droits des parents évoluent aussi.</span> Le parent
              qui crée la famille reste administrateur, mais peut donner ou retirer à tout moment
              à un autre parent (ex. un beau-parent) l’accès à l’argent, aux paramètres ou à la
              gestion des membres — droit par droit, sans tout partager d’un bloc.
            </p>
          </div>
        </section>

        <section className="mt-20 grid items-center gap-10 sm:mt-28 lg:grid-cols-2">
          <PhotoSlot
            basePath="/images/landing/child-coins"
            alt="Un enfant heureux qui compte ses pièces d’argent de poche"
            className="mx-auto w-full max-w-sm rounded-[1.75rem] object-cover shadow-sm"
            fallback={<ChildCountingCoinsIllustration className="mx-auto w-full max-w-sm" />}
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">
              Argent de poche
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Des enfants qui comprennent la valeur de l’argent, en s’amusant.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Chaque enfant a son propre solde, son historique et ses corvées récompensées — en argent réel
              ou en points, selon ce que vous choisissez. Les parents gardent la main sur chaque versement.
            </p>
          </div>
        </section>

        <section className="mt-20 grid items-center gap-10 sm:mt-28 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-400">
              Épargne
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Apprendre à épargner, avec une vision claire de ses progrès.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Objectifs d’épargne, intérêts calculés automatiquement, historique inviolable : chaque enfant
              voit son épargne grandir et comprend d’où vient chaque centime.
            </p>
          </div>
          <PhotoSlot
            basePath="/images/landing/savings"
            alt="Un enfant qui met une pièce dans sa tirelire"
            className="order-1 mx-auto w-full max-w-sm rounded-[1.75rem] object-cover shadow-sm lg:order-2"
            fallback={<SavingsGrowthIllustration className="order-1 mx-auto w-full max-w-sm lg:order-2" />}
          />
        </section>

        <section id="process" className="mt-20 scroll-mt-28 sm:mt-28">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600 dark:text-brand-400">
                Comment ça marche
              </p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                Trois étapes pour passer d’un quotidien éparpillé à un système qui tourne tout seul.
              </h2>
            </div>
            <div className="grid gap-4">
              {STEPS.map((step) => (
                <div
                  key={step.title}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mt-20 scroll-mt-28 sm:mt-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600 dark:text-brand-400">
              Tarifs
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Choisissez le niveau qui correspond à votre famille.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Commencez gratuitement avec un enfant, puis passez à l’abonnement annuel qui
              correspond à la taille de votre famille pour débloquer toutes les sections.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[1.75rem] border p-6 ${
                  plan.featured
                    ? 'border-brand-300 bg-brand-50 shadow-lg dark:border-brand-700 dark:bg-brand-900/20'
                    : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                {plan.featured ? (
                  <div className="mb-4 inline-flex rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
                    Recommandé
                  </div>
                ) : null}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-end gap-2">
                  <div className="text-4xl font-semibold">{plan.monthlyEquivalent}</div>
                  <div className="pb-1 text-sm text-slate-500 dark:text-slate-400">/ mois</div>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.billingNote}</p>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{plan.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-3 font-semibold transition ${
                    plan.featured
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:text-brand-400'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Honest value statements, not testimonials — see the VALUE_QUOTES comment above:
            the app has no external users yet, so nothing here is attributed to an invented
            person. Swap for real quotes once real families have used it. */}
        <section className="mt-20 scroll-mt-28 sm:mt-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600 dark:text-brand-400">
              Ce que FamilyApp change au quotidien
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Ce que les parents cherchent à obtenir, concrètement.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {VALUE_QUOTES.map((item) => (
              <div
                key={item.quote}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-2xl">{item.icon}</div>
                <p className="mt-3 text-lg leading-7 text-slate-700 dark:text-slate-200">« {item.quote} »</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-20 scroll-mt-28 sm:mt-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600 dark:text-brand-400">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Les questions les plus fréquentes.</h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {FAQ.map((item) => (
              <div
                key={item.question}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="mt-20 scroll-mt-28 sm:mt-28">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600 dark:text-brand-400">
                  Contact
                </p>
                <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                  Une question avant de vous lancer ?
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                  Écrivez-nous, on répond dès que possible — pas besoin de créer un compte pour
                  nous contacter.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/contact"
                  className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
                >
                  Nous contacter
                </Link>
                <a
                  href="mailto:informations@unmatched.ch"
                  className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:text-brand-400"
                >
                  informations@unmatched.ch
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 rounded-[2rem] bg-brand-600 p-8 text-white sm:mt-28 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Prêt à aider vos enfants à apprendre la valeur de l’argent ?
              </h2>
              <p className="mt-4 text-lg leading-8 text-brand-50">
                Créez votre famille en une minute et mettez en place un système simple, motivant
                et durable pour l’argent, les corvées et le quotidien de toute la maison.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-full bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                Commencer gratuitement
              </Link>
              <Link
                to="/family-login"
                className="rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                J’ai déjà un compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Centralized mobile CTA: once the header's own button has scrolled out of reach, this
          is the one action always within thumb's reach — same wording as everywhere else on
          the page, so there's never more than one thing to decide. Hidden on desktop, where
          the header button stays visible (sticky header). */}
      {showStickyCta && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 sm:hidden">
          <Link
            to="/register"
            className="block w-full rounded-full bg-brand-600 py-3 text-center font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
          >
            Commencer gratuitement
          </Link>
        </div>
      )}

      <footer className="mx-auto flex max-w-5xl justify-center gap-4 px-4 pb-24 text-center sm:px-6 sm:pb-10">
        <Link to="/contact" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          Nous contacter
        </Link>
        <Link to="/privacy" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          Confidentialité
        </Link>
        <Link to="/terms" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          CGU
        </Link>
      </footer>
    </div>
  );
}
