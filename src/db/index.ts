import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "baseweight.sqlite");

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS trails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      distance_miles REAL NOT NULL,
      elevation_gain_ft INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      climate TEXT NOT NULL,
      season_hint TEXT NOT NULL,
      notes TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS catalog_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      weight_grams INTEGER NOT NULL,
      price_usd REAL NOT NULL,
      r_value REAL,
      capacity_liters REAL,
      temperature_rating_f INTEGER,
      waterproof_rating TEXT,
      durability INTEGER NOT NULL,
      comfort INTEGER NOT NULL,
      skill_level TEXT NOT NULL,
      best_for TEXT NOT NULL,
      description TEXT NOT NULL,
      image_hint TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_gear (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      weight_grams INTEGER NOT NULL,
      price_usd REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      worn INTEGER NOT NULL DEFAULT 0,
      consumable INTEGER NOT NULL DEFAULT 0,
      packed INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      catalog_item_id INTEGER,
      created_at TEXT NOT NULL
    );
  `);

  return sqlite;
}

const globalForDb = globalThis as unknown as {
  __baseweightSqlite?: Database.Database;
  __baseweightDb?: ReturnType<typeof drizzle<typeof schema>>;
};

const sqlite = globalForDb.__baseweightSqlite ?? ensureDb();
export const db = globalForDb.__baseweightDb ?? drizzle(sqlite, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__baseweightSqlite = sqlite;
  globalForDb.__baseweightDb = db;
}
