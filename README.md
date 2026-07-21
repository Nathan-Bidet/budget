# Budget Familial

Application self-hosted de suivi de budget familial : import de relevés bancaires PDF, catégorisation automatique, vue consolidée du foyer avec rôles admin/membre.

## Stack

- **Frontend** : Next.js (App Router, PWA installable) — dossier `frontend/`
- **Backend** : Fastify + Prisma (API REST, JWT) — dossier `backend/`
- **Base de données** : PostgreSQL
- **Reverse proxy / HTTPS** : Caddy (Let's Encrypt automatique)
- **Déploiement** : Docker Compose sur VM Ubuntu

## Architecture

```
budget-familial/
├── backend/            API Fastify + Prisma
│   ├── prisma/         Schéma & migrations
│   └── src/
│       ├── routes/     auth, accounts, transactions, categories
│       ├── plugins/    prisma, auth (JWT)
│       └── lib/        parsing PDF, catégorisation
├── frontend/           App Next.js (PWA)
│   └── app/            login, dashboard
├── docker-compose.yml  app + postgres + caddy
├── Caddyfile           HTTPS / reverse proxy
└── .env.example        variables d'environnement
```

## Rôles

- **admin** : voit et gère l'ensemble du budget du foyer (tous les membres, tous les comptes).
- **membre** : voit ses propres dépenses et les dépenses communes du foyer.

## Démarrage local (dev)

```bash
cp .env.example .env        # renseigner les secrets
# Backend
cd backend && npm install && npx prisma migrate dev && npm run dev
# Frontend (autre terminal)
cd frontend && npm install && npm run dev
```

- Frontend : http://localhost:3000
- Backend  : http://localhost:4000

## Déploiement (prod)

Avant le premier déploiement, générer la migration initiale (une fois, en local
avec une base accessible) puis la committer :

```bash
cd backend
npx prisma migrate dev --name init   # crée prisma/migrations/
```

Le conteneur backend applique ensuite automatiquement les migrations
(`prisma migrate deploy`) à chaque démarrage.

```bash
cp .env.example .env        # renseigner DOMAIN, secrets, mots de passe DB
docker compose up -d --build
```

Caddy obtient et renouvelle automatiquement le certificat TLS pour le domaine défini dans `.env` / `Caddyfile`.

## Prochaines étapes

1. Fournir un relevé bancaire **anonymisé** (montants/noms masqués) → écriture du parser PDF dédié à ta banque.
2. Règles de catégorisation (mots-clés, montants récurrents) + apprentissage progressif.
3. Écrans dashboard : graphiques par catégorie, par membre, évolution mensuelle.
