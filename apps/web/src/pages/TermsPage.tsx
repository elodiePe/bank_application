import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Conditions générales d'utilisation</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dernière mise à jour : 3 août 2026</p>

      <div className="prose prose-slate mt-6 max-w-none space-y-5 text-sm leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-300">
        <section>
          <h2 className="text-lg font-semibold">1. Objet</h2>
          <p>
            FamilyApp est une application de gestion familiale (argent de poche, corvées, planning des repas et du
            ménage, listes de courses) éditée à titre individuel par Elodie Perring. En créant un compte famille,
            tu acceptes les présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Création d'un compte famille</h2>
          <p>
            Le compte famille est créé et administré par un parent, qui devient responsable des profils des
            membres (autres parents, enfants) qu'il ajoute. En ajoutant un profil enfant, le parent confirme être
            son représentant légal et consentir, en son nom, au traitement de ses données (voir notre{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
              politique de confidentialité
            </Link>
            ).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Nature du service — pas un établissement financier</h2>
          <p>
            Les soldes et transactions affichés dans FamilyApp sont un outil de suivi interne à la famille. Aucun
            argent réel n'est détenu, transféré ou géré par FamilyApp : les mouvements enregistrés (dépôts,
            retraits, virements, intérêts, cours boursiers) sont purement déclaratifs et n'ont aucune valeur
            légale de moyen de paiement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Utilisation acceptable</h2>
          <p>
            Chaque compte famille est destiné à un usage strictement privé et familial. Il est interdit d'utiliser
            le service à des fins illégales ou de tenter d'accéder aux données d'une autre famille.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Disponibilité et évolution du service</h2>
          <p>
            Nous nous efforçons d'assurer la disponibilité du service mais ne pouvons garantir une disponibilité
            continue. Les fonctionnalités peuvent évoluer ; toute modification substantielle des présentes
            conditions te sera signalée.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Suppression du compte</h2>
          <p>
            Tu peux supprimer ton compte famille à tout moment depuis les paramètres. Cette action est
            irréversible et entraîne la suppression définitive de toutes les données associées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Contact</h2>
          <p>
            Pour toute question relative à ces conditions, contacte-nous à informations@unmatched.ch ou via notre{' '}
            <Link to="/contact" className="text-brand-600 hover:underline dark:text-brand-400">
              page de contact
            </Link>
            .
          </p>
        </section>
      </div>

      <Link to="/" className="mt-8 inline-block text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Retour à l'accueil
      </Link>
    </div>
  );
}
