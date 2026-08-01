# Baseweight

Pack coach for backpackers and mountaineers — pack lists first (LighterPack-style), optional trip assignment, gear inventory, trip journal, trail checks, and community shakedowns.

## Stack

- Next.js (App Router) on **Vercel**
- PostgreSQL on **Render**
- Drizzle ORM

## Local setup

1. Copy env file and paste your Render **External Database URL**:

```bash
cp .env.example .env.local
```

2. Push schema + seed, then run the app:

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo account (seeded automatically): `demo@baseweight.app` / `demo1234`

Accounts, sessions, locker items, and trips are stored in Postgres. Sign in (or register) from the **Account** section on the home page.

## Deploy for testing (Render DB + Vercel app)

### 1) Render Postgres

1. In [Render](https://dashboard.render.com), open your existing Postgres (or create one from `render.yaml` / New → PostgreSQL).
2. Open the DB → **Connect** → copy **External Database URL**  
   (starts with `postgresql://…` and is reachable from outside Render — required for Vercel).
3. Confirm the DB allows external connections (default on paid/external URL).

### 2) Push this repo to GitHub

Vercel deploys from GitHub. Commit your latest code and push to `origin/main`.

### 3) Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import `Bensoo00/baseweight`.
2. Framework: **Next.js** (auto-detected).
3. Environment variables:
   - `DATABASE_URL` = Render **External** Postgres URL
4. Deploy.

Tables and seed data are created automatically on the first request (`ensureSchema` + `seedIfEmpty`). You do not need `drizzle-kit` during the Vercel build.

Optional local setup against Render:

```bash
npm run db:setup
```

### 4) Custom domain (optional)

In Vercel → Project → Domains → add `base-weight.net` and follow DNS instructions.

## Scripts

| Command | What it does |
|--------|----------------|
| `npm run db:push` | Sync Drizzle schema to Postgres |
| `npm run db:seed` | Seed trails/catalog/sample data if empty |
| `npm run db:setup` | push + seed |
| `npm run build` | Next production build |
| `npm run dev` | local Next server |
