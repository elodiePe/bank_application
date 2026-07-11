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
  imports/   Emplacement prévu pour les CSV d'historique (Elodie, Matthieu, Damien) — non versionnés
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
npm run dev
```

- API : http://localhost:4000 (health check : `GET /health`)
- Web : http://localhost:5173

## Scripts racine

| Commande         | Description                                      |
| ---------------- | ------------------------------------------------- |
| `npm run dev`     | Build `shared` puis lance `shared` (watch), l'API et le frontend en parallèle |
| `npm run build`   | Build shared → api → web                           |
| `npm run lint`    | Lint des deux applications                         |
| `npm run format`  | Formatte tout le repo avec Prettier                |
| `npm run test`    | Lance les tests (Vitest) de chaque app si présents |

## État du projet

Développement itératif par étapes (voir le plan associé). Étape actuelle : **0 — Fondations du
monorepo**.
