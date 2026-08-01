import { config } from "dotenv";
import { existsSync } from "fs";
import { defineConfig } from "drizzle-kit";

for (const path of [".env.local", ".env"]) {
  if (existsSync(path)) config({ path, override: false });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_URL.includes("render.com") ||
      process.env.PGSSL === "true",
  },
});
