import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">Politique de confidentialité</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dernière mise à jour : 3 août 2026</p>

      <div className="prose prose-slate mt-6 max-w-none space-y-5 text-sm leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-300">
        <section>
          <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
          <p>
            FamilyApp est édité à titre individuel par Elodie Perring. Pour toute question relative à tes
            données personnelles, tu peux nous contacter :
          </p>
          <ul className="list-disc pl-5">
            <li>Par e-mail : informations@unmatched.ch</li>
            <li>
              Via notre{' '}
              <Link to="/contact" className="text-brand-600 hover:underline dark:text-brand-400">
                page de contact
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Données collectées</h2>
          <p>Nous collectons uniquement les données nécessaires au fonctionnement de l'application :</p>
          <ul className="list-disc pl-5">
            <li>Prénom, adresse e-mail (parents), rôle au sein de la famille</li>
            <li>Comptes, transactions, demandes d'argent, corvées, planning des repas/du ménage, listes de courses</li>
            <li>
              Photo de justificatif éventuellement jointe à une demande d'argent (stockée uniquement à ta demande)
            </li>
            <li>Préférences de notification et, si activées, un identifiant d'abonnement aux notifications push</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Base légale et finalités</h2>
          <p>
            Le traitement repose sur l'exécution du contrat qui te lie à FamilyApp (fournir le service que tu as
            demandé) et, pour les enfants, sur le consentement explicite du parent qui crée leur profil (RGPD
            art. 8). Ce consentement est enregistré au moment de l'ajout de l'enfant.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Hébergement et sous-traitants</h2>
          <p>
            Les données sont hébergées chez Supabase, actuellement sur des serveurs situés dans l'Union
            européenne (Francfort, Allemagne). Une migration vers un hébergement en Suisse est prévue ; cette
            page sera mise à jour en conséquence.
          </p>
          <p>Nous faisons appel aux sous-traitants suivants, chacun n'ayant accès qu'aux données nécessaires à son rôle :</p>
          <ul className="list-disc pl-5">
            <li>Supabase (base de données)</li>
            <li>Infomaniak (envoi d'e-mails transactionnels)</li>
            <li>Finnhub (cours boursiers, aucune donnée personnelle transmise)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Conservation des données</h2>
          <p>
            Tes données sont conservées tant que ton compte famille existe. Tu peux supprimer ton compte famille à
            tout moment depuis les paramètres, ce qui entraîne la suppression définitive de toutes les données
            associées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Tes droits</h2>
          <p>
            Conformément au RGPD et à la loi suisse sur la protection des données (LPD/nLPD), tu disposes d'un
            droit d'accès, de rectification, d'effacement et de portabilité de tes données.
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Accès et portabilité</strong> : depuis Paramètres → Confidentialité, tu peux télécharger une
              copie complète de toutes les données de ta famille au format JSON.
            </li>
            <li>
              <strong>Rectification</strong> : modifiable directement depuis l'application (compte, profils).
            </li>
            <li>
              <strong>Effacement</strong> : suppression d'un membre ou de la famille entière depuis les paramètres.
            </li>
          </ul>
          <p>Pour toute autre demande, contacte-nous à informations@unmatched.ch.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Cookies</h2>
          <p>
            FamilyApp n'utilise aucun cookie publicitaire ou de suivi. Les seuls cookies déposés sont strictement
            nécessaires à la connexion (jeton de session, jeton de rafraîchissement, identifiant du compte
            famille) et ne sont jamais partagés avec des tiers.
          </p>
        </section>
      </div>

      <Link to="/" className="mt-8 inline-block text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Retour à l'accueil
      </Link>
    </div>
  );
}
