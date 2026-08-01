import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDb = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __baseweightPool?: Pool;
  __baseweightDb?: AppDb;
  __baseweightSchemaReady?: Promise<void>;
};

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Set it in Vercel → Settings → Environment Variables (Render External Database URL).",
    );
  }
  return url;
}

/** Normalize Render URLs so SSL works from Vercel. */
export function normalizeDatabaseUrl(url: string) {
  if (!url.includes("render.com")) return url;
  if (url.includes("sslmode=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

export function getPool() {
  if (globalForDb.__baseweightPool) return globalForDb.__baseweightPool;

  const connectionString = normalizeDatabaseUrl(requireDatabaseUrl());
  const needsSsl =
    connectionString.includes("render.com") ||
    connectionString.includes("sslmode=require") ||
    process.env.PGSSL === "true" ||
    process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString,
    max: process.env.VERCEL ? 1 : 5,
    idleTimeoutMillis: process.env.VERCEL ? 10_000 : 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  globalForDb.__baseweightPool = pool;
  return pool;
}

function getDb(): AppDb {
  if (globalForDb.__baseweightDb) return globalForDb.__baseweightDb;
  const db = drizzle(getPool(), { schema });
  globalForDb.__baseweightDb = db;
  return db;
}

/** Lazy DB proxy so `next build` can import modules without DATABASE_URL. */
export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS trails (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  distance_miles DOUBLE PRECISION NOT NULL,
  elevation_gain_ft INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  climate TEXT NOT NULL,
  season_hint TEXT NOT NULL,
  notes TEXT NOT NULL,
  min_r_value DOUBLE PRECISION,
  requires_bear_canister BOOLEAN NOT NULL DEFAULT FALSE,
  requires_traction BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS catalog_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  weight_grams INTEGER NOT NULL,
  price_usd DOUBLE PRECISION NOT NULL,
  r_value DOUBLE PRECISION,
  capacity_liters DOUBLE PRECISION,
  temperature_rating_f INTEGER,
  waterproof_rating TEXT,
  durability INTEGER NOT NULL,
  comfort INTEGER NOT NULL,
  skill_level TEXT NOT NULL,
  best_for TEXT NOT NULL,
  description TEXT NOT NULL,
  image_hint TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locker_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  weight_grams INTEGER NOT NULL,
  price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  worn_default BOOLEAN NOT NULL DEFAULT FALSE,
  consumable_default BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  catalog_item_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  trail_id INTEGER,
  nights INTEGER NOT NULL DEFAULT 2,
  season TEXT NOT NULL DEFAULT 'summer',
  target_base_weight_grams INTEGER NOT NULL DEFAULT 4536,
  share_slug TEXT NOT NULL UNIQUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_items (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL,
  locker_item_id INTEGER,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  weight_grams INTEGER NOT NULL,
  price_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  worn BOOLEAN NOT NULL DEFAULT FALSE,
  consumable BOOLEAN NOT NULL DEFAULT FALSE,
  maybe BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER,
  share_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL,
  trail_name TEXT NOT NULL DEFAULT '',
  nights INTEGER NOT NULL DEFAULT 0,
  season TEXT NOT NULL DEFAULT 'summer',
  base_weight_grams INTEGER NOT NULL DEFAULT 0,
  pack_weight_grams INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  clones_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export async function ensureSchema() {
  if (!globalForDb.__baseweightSchemaReady) {
    globalForDb.__baseweightSchemaReady = (async () => {
      const pool = getPool();
      await pool.query(CREATE_SQL);
    })().catch((error) => {
      globalForDb.__baseweightSchemaReady = undefined;
      throw error;
    });
  }
  await globalForDb.__baseweightSchemaReady;
}
