import { config } from "dotenv";
import { existsSync } from "fs";
import { defineConfig } from "drizzle-kit";

for (const path of [".env.local", ".env"]) {
  if (existsSync(path)) config({ path, override: false });
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

const normalized =
  url.includes("render.com") && !url.includes("sslmode=")
    ? `${url}${url.includes("?") ? "&" : "?"}sslmode=require`
    : url;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: normalized,
    ssl:
      normalized.includes("render.com") ||
      normalized.includes("sslmode=require") ||
      process.env.PGSSL === "true",
  },
});

