# Banque Familiale

PWA de gestion d'argent de poche familial : les parents administrent un compte principal, chaque
enfant dispose d'un compte virtuel avec historique, demandes d'argent, intérêts mensuels,
statistiques et export.

## Architecture

Monorepo npm workspaces :

```
apps/
  web/       Frontend — Vite + React + TypeScript + Tailwind CSS (PWA)
  api/       Backend  — Node + Express + TypeScript (Prisma + SQLite à partir de l'étape 1)
packages/
  shared/    Types et schémas partagés entre web et api
data/
  imports/   CSV d'historique (Elodie, Matthieu, Damien) — données personnelles, jamais versionnées
```

**Pourquoi un backend séparé plutôt que Next.js ou une base en local dans le navigateur ?**
Prisma nécessite un runtime Node (il ne fonctionne pas dans un navigateur). Un vrai backend permet
aussi un hachage sécurisé des mots de passe/PIN côté serveur, de vraies notifications push (Web
Push), et une trajectoire propre vers un déploiement public (HTTPS, cookies sécurisés). Vite reste
le bundler du frontend comme demandé, sans dépendre d'un framework full-stack.

## Prérequis

- Node.js ≥ 20
- npm ≥ 10

## Démarrage

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run -w apps/api db:migrate   # crée apps/api/prisma/dev.db et applique le schéma
npm run dev
```

- API : http://localhost:4000 (health check : `GET /health`)
- Web : http://localhost:5173

## Base de données

Le schéma Prisma vit dans [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) :
`Family`, `User`, `ChildAccount`, `Transaction`, `MoneyRequest`, `Notification`,
`InterestHistory`, `Settings`, `AuditLog`. Tous les montants sont stockés en **centimes**
(entiers) pour éviter les erreurs d'arrondi.

| Commande (depuis `apps/api`) | Description                                                |
| ----------------------------- | ----------------------------------------------------------- |
| `npm run db:migrate`          | Crée/applique une migration (dev)                           |
| `npm run db:seed`             | (Re)crée la famille de démo (Papa, Maman, Elodie, Matthieu, Damien) — idempotent |
| `npm run db:studio`           | Ouvre Prisma Studio pour explorer les données                |

`db:migrate` exécute automatiquement `db:seed` après la migration. Les identifiants de démo
(mots de passe/PIN en clair) sont documentés dans [`apps/api/prisma/seed.ts`](apps/api/prisma/seed.ts) —
usage local uniquement.

## Authentification

### Code d'accès familial

Avant même l'écran "Qui se connecte ?", un **code d'accès partagé** protège toute la famille contre
un visiteur qui tomberait sur l'URL par hasard : `GET /auth/members` et les deux routes de login sont
gardées par le middleware [`requireFamilyAccess`](apps/api/src/middleware/requireFamilyAccess.ts), qui
exige un cookie `httpOnly` séparé (JWT dédié, ~13 mois de validité — "se souvenir de cet appareil").
Le code lui-même n'est **jamais stocké en clair** : seul son hash bcrypt vit dans
`Settings.accessCodeHash`, calculé par le script de seed à partir de `FAMILY_ACCESS_CODE` (voir
`apps/api/.env`). Si aucun hash n'est configuré, l'accès est refusé par défaut (fail closed). Pour
changer le code : modifier `FAMILY_ACCESS_CODE` dans `.env` puis relancer `npm run db:seed -w apps/api`.

### Sessions

Sessions via JWT en cookies `httpOnly` (jamais `localStorage`, pour limiter l'exposition XSS) :

- **Parents** : mot de passe (`POST /auth/login-password`), PIN optionnel prévu pour plus tard.
- **Enfants** : PIN à 4 chiffres (`POST /auth/login-pin`).
- **Verrouillage** : un compte est bloqué 15 minutes après 5 échecs consécutifs — indispensable
  pour un PIN à 4 chiffres qui n'a que 10 000 combinaisons possibles.
- **Refresh token** : rotaté à chaque `POST /auth/refresh`, révocable en base (table
  `RefreshSession`) pour permettre une vraie déconnexion et une révocation en cas d'incident.
- **Extensibilité biométrique** : les vérifications d'identifiants passent par une interface
  `CredentialStrategy` ([`apps/api/src/services/authStrategies.ts`](apps/api/src/services/authStrategies.ts)) ;
  ajouter Face ID/Touch ID plus tard (WebAuthn/passkeys) ne demandera qu'une nouvelle stratégie,
  pas de changement dans `authService`.

## Actions Parent

Toutes les opérations sensibles vivent dans [`moneyService.ts`](apps/api/src/services/moneyService.ts),
réservé au rôle PARENT, chaque écriture étant atomique (`prisma.$transaction`) :

- **Dépôt / retrait** (`POST /transactions/deposit` / `/withdrawal`) — le retrait refuse un
  montant supérieur au solde (`422 INSUFFICIENT_FUNDS`).
- **Virement entre enfants** (`POST /transactions/transfer`) — crée deux transactions liées par
  un `transferGroupId` (débit + crédit), jamais une seule ligne bidirectionnelle.
- **Correction** (`POST /transactions/:id/correct`) — jamais de suppression : une nouvelle
  transaction inverse est créée (`reversalOfId`), appliquée au solde **actuel** (pas réécrite dans
  le passé). Corriger une jambe de virement corrige automatiquement les deux. Une opération déjà
  corrigée ne peut pas l'être une seconde fois (`409 ALREADY_REVERSED`).
- **Taux d'intérêt** (`PUT /settings/interest-rate`) — journalisé dans `AuditLog`.

Chaque compte enfant manipulé est vérifié comme appartenant à la famille de l'appelant
(`403 FORBIDDEN` sinon) — prêt pour le jour où l'application gérera plusieurs familles.

## Argent de poche hebdomadaire

Chaque enfant peut avoir un montant hebdomadaire différent, configurable par les parents
(`PUT /children/:accountId/allowance`, 0 = désactivé), versé automatiquement tous les **lundis**.

Le traitement ([`allowanceService.ts`](apps/api/src/services/allowanceService.ts)) est
**idempotent et rattrape les semaines manquées** : il tourne au démarrage du serveur puis toutes
les heures ([`server.ts`](apps/api/src/server.ts)), plutôt que de dépendre d'un vrai cron externe
— pertinent tant que l'application ne tourne pas 24h/24 sur un serveur toujours allumé. Chaque
semaine payée est enregistrée dans `AllowanceHistory` (contrainte unique `accountId`+`weekStart`)
pour ne jamais payer deux fois la même semaine, même après plusieurs redémarrages. Activer la
fonctionnalité sur un compte existant ne rattrape que les semaines depuis l'activation
(`allowanceEnabledSince`), jamais depuis la création du compte.

## Import d'historique CSV

Le solde de chaque enfant est calculé automatiquement à partir de son historique, jamais saisi
à la main. Format attendu (export MyKidsBank) :

```
month_index,period_start,period_end,date,description,withdrawal,deposit,balance,currency
```

Seules `date` (MM/DD/YYYY), `description`, `withdrawal`, `deposit` sont importées ; `balance` sert
uniquement de **vérification** — le script recalcule sa propre valeur ligne par ligne et refuse
d'importer si elle diverge du fichier (à moins de passer `--force`).

```bash
cd apps/api
npm run import:csv -- --child Elodie --file "../../data/imports/mon-fichier.csv"
```

Le script est **réutilisable et idempotent** : chaque ligne est identifiée par
`nom-de-fichier + numéro de ligne`, donc relancer avec le même fichier ne duplique rien. Un
export ultérieur qui reprend le même nom de fichier avec des lignes ajoutées à la fin n'importe
que les nouvelles lignes. Un fichier portant un **nom différent** est en revanche considéré comme
une source distincte et importé intégralement, en s'ajoutant au solde déjà en base — pratique
pour une correction ponctuelle, mais à garder en tête pour ne pas dupliquer un historique complet
sous un autre nom.

Les trois historiques réels ont été importés (voir `apps/api/prisma/seed.ts` pour les comptes
correspondants) ; les fichiers CSV eux-mêmes restent dans `data/imports/` sans être versionnés.

## Dashboard Enfant + demandes d'argent

Chaque enfant a sa propre vue (`GET /dashboard/me/overview`, `/dashboard/me/transactions`) limitée
à son compte — jamais celui de ses frères et sœurs. Il peut envoyer trois types de demandes
([`moneyRequestService.ts`](apps/api/src/services/moneyRequestService.ts)) :

- **Demande de dépôt / retrait** — adressée génériquement "aux parents" (`targetUserId` nul) ;
  **n'importe quel parent** de la famille peut l'accepter ou la refuser.
- **Demande à un frère/une sœur** — cible un enfant précis ; **seul cet enfant** peut l'accepter
  (ni un parent, ni un autre frère/sœur). L'acceptation déclenche un virement automatique du
  compte de l'enfant ciblé vers celui du demandeur, via `moneyService.transfer` — même logique
  atomique et même trace comptable qu'un virement fait directement par un parent.

Une demande acceptée exécute le mouvement d'argent réel (dépôt/retrait/virement) puis passe à
`APPROVED` ; le demandeur peut annuler sa propre demande tant qu'elle est `PENDING`. Une demande
qui n'est plus en attente ne peut plus être traitée (`409 INVALID_REQUEST_STATE`).

## PWA (installable, hors ligne, notifications push)

- **Icônes** : générées programmatiquement (`apps/web/scripts/generate-icons.ts`, `pngjs` pur JS,
  aucune dépendance native) → `apps/web/public/icons/`. `npm run generate:icons -w apps/web` pour
  regénérer après une modification du dessin.
- **Manifest + service worker** : `vite-plugin-pwa` en mode `injectManifest` (pas `generateSW`) pour
  garder la main sur le service worker custom ([`apps/web/src/sw.ts`](apps/web/src/sw.ts)) : precache
  de l'app shell (Workbox), cache `NetworkFirst` pour `/api/dashboard/*`, `StaleWhileRevalidate` pour
  le reste des lectures API, et gestion manuelle des évènements `push`/`notificationclick`.
- **Hors ligne** : le cache TanStack Query est persisté dans IndexedDB
  (`apps/web/src/pwa/queryPersister.ts`, via `idb-keyval`) — les derniers soldes/historique/notifs
  restent visibles sans réseau. Un bandeau (`OfflineBanner`) prévient l'utilisateur quand il est hors
  ligne ; un toast (`UpdatePrompt`) propose de recharger quand une nouvelle version est disponible.
  Les requêtes liées à `auth` ne sont jamais persistées (jamais rejouer une session depuis le disque).
- **Notifications push réelles** : `PushSubscription` (une ligne par device) + `web-push` (VAPID) côté
  API ([`pushService.ts`](apps/api/src/services/pushService.ts)) — chaque notification in-app créée
  par `notificationService` déclenche aussi une tentative de push best-effort (jamais bloquante : un
  échec d'envoi ne fait jamais échouer l'opération financière qui l'a déclenché). Une subscription que
  le navigateur signale comme expirée (410/404) est supprimée automatiquement. Activation côté
  frontend via un bouton dans le panneau de notifications (`usePushSubscription.ts`).

## Déploiement

L'app est pensée pour un hébergement en trois parties, car **GitHub Pages ne sert que du contenu
statique** : il peut héberger `apps/web` (le build Vite) mais **ne peut pas exécuter `apps/api`**
(Express + Prisma), et la base de données PostgreSQL vit séparément sur Supabase.

### 1. Frontend → GitHub Pages

Un workflow est déjà en place : [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml).
Il se déclenche à chaque push sur `main` qui touche `apps/web` ou `packages/shared`, build avec le bon
`base` (`/<nom-du-repo>/`, calculé automatiquement) et publie `apps/web/dist` sur GitHub Pages.

Étapes ponctuelles à faire une fois, dans les réglages du dépôt GitHub :

1. **Settings → Pages → Source** : choisir "GitHub Actions" (pas "Deploy from a branch").
2. **Settings → Secrets and variables → Actions → Variables** : ajouter une variable **`VITE_API_URL`**
   pointant vers l'API une fois déployée (étape 2 ci-dessous), ex. `https://banque-familiale-api.onrender.com`.
   Sans elle, le frontend buildé pointera par défaut sur `http://localhost:4000`.
3. Pousser sur `main` (ou lancer le workflow manuellement depuis l'onglet **Actions**) — le site sera
   servi sur `https://<utilisateur>.github.io/<nom-du-repo>/`.

Détails techniques déjà gérés par le code (rien d'autre à faire) :

- `vite.config.ts` lit `VITE_BASE_PATH` (mis à `/<repo>/` par le workflow) pour que tous les assets et
  le manifest PWA se résolvent correctement sous un sous-chemin plutôt qu'à la racine du domaine.
- `App.tsx` passe `basename={import.meta.env.BASE_URL}` à `BrowserRouter` pour que le routage
  côté client tienne compte de ce même sous-chemin.
- `scripts/copy-spa-fallback.mjs` (lancé par `npm run build:pages`) duplique `index.html` en
  `404.html` : GitHub Pages n'a pas de réécriture serveur, donc un lien profond (`/history`) rafraîchi
  renverrait un vrai 404 sans ce fallback classique pour les SPA.

### 2. Base de données → Supabase (PostgreSQL)

1. Créer un projet sur [supabase.com](https://supabase.com) (gratuit).
2. **Project Settings → Database → Connect → ORMs → Prisma** donne deux chaînes de connexion :
   `DATABASE_URL` (port 6543, pooler transaction — utilisée à l'exécution) et `DIRECT_URL`
   (port 5432, connexion directe — utilisée pour les migrations). Remplacer `[YOUR-PASSWORD]`
   par le mot de passe de la base (visible/réinitialisable dans ce même écran).
3. Si le mot de passe contient des caractères spéciaux (`@ + & ? # %` etc.), il doit être
   URL-encodé dans la chaîne de connexion (`encodeURIComponent(motDePasse)`), sinon l'URL est
   mal interprétée et la connexion échoue silencieusement avec une erreur d'authentification.

### 3. Backend → Render

Un blueprint est déjà en place : [`render.yaml`](render.yaml) (build/démarrage, migration Prisma
automatique au déploiement via `prisma migrate deploy`, variables d'environnement listées).

1. Sur [render.com](https://render.com) : **New → Blueprint**, connecter ce dépôt GitHub — Render
   détecte `render.yaml` automatiquement.
2. Renseigner les variables marquées `sync: false` dans le blueprint (non générées automatiquement) :
   `WEB_ORIGIN` (l'URL GitHub Pages exacte, **sans** sous-chemin ni slash final — utilisée
   uniquement pour le CORS, qui compare l'origine au caractère près), `WEB_APP_URL` (la même URL
   mais **avec** le sous-chemin, ex. `https://username.github.io/bank_application` — c'est celle-ci
   qui sert à construire les liens dans les e-mails ; une page GitHub Pages de type projet est
   servie depuis un sous-chemin, pas la racine du domaine), `DATABASE_URL`/`DIRECT_URL` (étape 2
   ci-dessus), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (générer une paire dédiée à la
   prod avec `npx web-push generate-vapid-keys`, ne jamais réutiliser celle du `.env` de dev),
   `RESEND_API_KEY`/`EMAIL_FROM`, et `FINNHUB_API_KEY`.
   L'envoi d'e-mail passe par [Resend](https://resend.com) (API HTTP) plutôt que par du SMTP
   classique : Render bloque les connexions sortantes sur les ports mail (25/465/587), donc un
   fournisseur SMTP (Infomaniak, etc.) ne fonctionnera jamais depuis Render, quels que soient les
   identifiants. Sur Resend : créer un compte, vérifier le domaine d'envoi (`Domains` → ajouter les
   enregistrements DNS fournis chez l'hébergeur du domaine), puis créer une clé API.
3. `COOKIE_SECURE=true` est déjà fixé dans le blueprint — indispensable en HTTPS : au-delà du
   flag `Secure`, il fait aussi passer les cookies en `SameSite=None`, requis puisque le frontend
   (GitHub Pages) et l'API (Render) sont sur des domaines différents.
4. Renseigner `VITE_API_URL` (étape 1) avec l'URL Render obtenue ici, puis relancer le workflow
   GitHub Pages.

## Scripts racine

| Commande         | Description                                      |
| ---------------- | ------------------------------------------------- |
| `npm run dev`     | Build `shared` puis lance `shared` (watch), l'API et le frontend en parallèle |
| `npm run build`   | Build shared → api → web                           |
| `npm run lint`    | Lint des deux applications                         |
| `npm run format`  | Formatte tout le repo avec Prettier                |
| `npm run test`    | Lance les tests (Vitest) de chaque app si présents |

## État du projet

Développement itératif par étapes (voir le plan associé).

- [x] Étape 0 — Fondations du monorepo
- [x] Étape 1 — Modèle de données Prisma + seed de la famille de démo
- [x] Étape 2 — Authentification (mot de passe/PIN parents, PIN enfants)
- [x] Étape 3 — Script d'import CSV réutilisable + calcul automatique des soldes
- [x] Étape 4 — Dashboard Parent (lecture : soldes, historiques, demandes en attente)
- [x] Étape 5 — Actions Parent (dépôt/retrait, virement, correction, taux d'intérêt)
- [x] Argent de poche hebdomadaire automatique (montant par enfant, rattrapage borné)
- [x] Étape 6 — Dashboard Enfant + demandes d'argent (parent/parent, enfant/enfant)
- [x] Étape 7 — Centre de notifications in-app
- [x] Étape 8 — Intérêts mensuels automatiques (idempotents, compatibles import CSV historique)
- [x] Étape 9 — Timeline transactionnelle (recherche, filtres, tri, pagination)
- [ ] Étape 10 — Statistiques & graphiques *(reportée)*
- [ ] Étape 11 — Export CSV/Excel/PDF *(reportée)*
- [x] Étape 12 — PWA complète (icônes, manifest, service worker, hors ligne, notifications push)
- [ ] Étape 13 — Fonctionnalités bonus (objectifs d'épargne, tirelire, badges, etc.)
