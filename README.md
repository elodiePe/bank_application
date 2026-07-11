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
- [ ] Étape 4 — Dashboard Parent (lecture : soldes, historiques, demandes en attente)
