# Baseweight

Track backpacking and mountaineering gear with a friendly pack UI, live weight stats, and a SQL-backed gear recommender.

## Features

- **My Pack** — inventory with base weight, worn, consumables, category breakdown
- **Add Gear** — guided 3-step form with live weight/value preview
- **Recommend** — score catalog items by budget, max weight, trail, skill, and priorities

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- SQLite via Drizzle ORM + `better-sqlite3`
- Framer Motion / Lucide for light motion and icons

## Run locally

```bash
npm install
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

SQLite data lives in `data/baseweight.sqlite` (gitignored).
