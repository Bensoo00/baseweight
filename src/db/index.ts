import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDb = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __baseweightPool?: Pool;
  __baseweightDb?: AppDb;
};

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example → .env.local and paste your Render Postgres External Database URL.",
    );
  }
  return url;
}

function getPool() {
  if (globalForDb.__baseweightPool) return globalForDb.__baseweightPool;

  const connectionString = requireDatabaseUrl();
  const needsSsl =
    connectionString.includes("render.com") ||
    process.env.PGSSL === "true" ||
    process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString,
    max: process.env.VERCEL || process.env.NODE_ENV === "production" ? 3 : 5,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__baseweightPool = pool;
  }

  return pool;
}

function getDb(): AppDb {
  if (globalForDb.__baseweightDb) return globalForDb.__baseweightDb;
  const db = drizzle(getPool(), { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__baseweightDb = db;
  }
  return db;
}

/** Lazy DB proxy so `next build` can import modules without DATABASE_URL. */
export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});
