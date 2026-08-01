# Baseweight

Pack coach for backpackers and mountaineers — gear locker, trip packs, trail checks, community shakedowns.

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

The build script runs:

```bash
drizzle-kit push --force && tsx src/scripts/seed-cli.ts && next build
```

so tables + seed data are created on first deploy.

### 4) Custom domain (optional)

In Vercel → Project → Domains → add `base-weight.net` and follow DNS instructions.

## Scripts

| Command | What it does |
|--------|----------------|
| `npm run db:push` | Sync Drizzle schema to Postgres |
| `npm run db:seed` | Seed trails/catalog/sample data if empty |
| `npm run db:setup` | push + seed |
| `npm run build` | push + seed + Next production build |
| `npm run dev` | local Next server |
