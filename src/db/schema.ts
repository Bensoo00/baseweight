import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const trails = sqliteTable("trails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  region: text("region").notNull(),
  distanceMiles: real("distance_miles").notNull(),
  elevationGainFt: integer("elevation_gain_ft").notNull(),
  difficulty: text("difficulty", {
    enum: ["easy", "moderate", "hard", "expert"],
  }).notNull(),
  climate: text("climate", {
    enum: ["desert", "alpine", "forest", "coastal", "mixed"],
  }).notNull(),
  seasonHint: text("season_hint").notNull(),
  notes: text("notes").notNull(),
});

export const catalogItems = sqliteTable("catalog_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category", {
    enum: [
      "shelter",
      "sleep",
      "pack",
      "cook",
      "water",
      "clothing",
      "footwear",
      "navigation",
      "safety",
      "electronics",
      "hygiene",
      "other",
    ],
  }).notNull(),
  weightGrams: integer("weight_grams").notNull(),
  priceUsd: real("price_usd").notNull(),
  rValue: real("r_value"),
  capacityLiters: real("capacity_liters"),
  temperatureRatingF: integer("temperature_rating_f"),
  waterproofRating: text("waterproof_rating"),
  durability: integer("durability").notNull(), // 1-10
  comfort: integer("comfort").notNull(), // 1-10
  skillLevel: text("skill_level", {
    enum: ["beginner", "intermediate", "advanced"],
  }).notNull(),
  bestFor: text("best_for").notNull(), // comma-separated climates/trail types
  description: text("description").notNull(),
  imageHint: text("image_hint").notNull(),
});

export const userGear = sqliteTable("user_gear", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  brand: text("brand").notNull().default(""),
  category: text("category", {
    enum: [
      "shelter",
      "sleep",
      "pack",
      "cook",
      "water",
      "clothing",
      "footwear",
      "navigation",
      "safety",
      "electronics",
      "hygiene",
      "other",
    ],
  }).notNull(),
  weightGrams: integer("weight_grams").notNull(),
  priceUsd: real("price_usd").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
  worn: integer("worn", { mode: "boolean" }).notNull().default(false),
  consumable: integer("consumable", { mode: "boolean" }).notNull().default(false),
  packed: integer("packed", { mode: "boolean" }).notNull().default(true),
  notes: text("notes").notNull().default(""),
  catalogItemId: integer("catalog_item_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Trail = typeof trails.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type UserGear = typeof userGear.$inferSelect;
export type NewUserGear = typeof userGear.$inferInsert;
