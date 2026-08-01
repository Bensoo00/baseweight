import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";

export const trails = pgTable("trails", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  distanceMiles: doublePrecision("distance_miles").notNull(),
  elevationGainFt: integer("elevation_gain_ft").notNull(),
  difficulty: text("difficulty", {
    enum: ["easy", "moderate", "hard", "expert"],
  }).notNull(),
  climate: text("climate", {
    enum: ["desert", "alpine", "forest", "coastal", "mixed"],
  }).notNull(),
  seasonHint: text("season_hint").notNull(),
  notes: text("notes").notNull(),
  minRValue: doublePrecision("min_r_value"),
  requiresBearCanister: boolean("requires_bear_canister")
    .notNull()
    .default(false),
  requiresTraction: boolean("requires_traction").notNull().default(false),
});

export const catalogItems = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
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
  priceUsd: doublePrecision("price_usd").notNull(),
  rValue: doublePrecision("r_value"),
  capacityLiters: doublePrecision("capacity_liters"),
  temperatureRatingF: integer("temperature_rating_f"),
  waterproofRating: text("waterproof_rating"),
  durability: integer("durability").notNull(),
  comfort: integer("comfort").notNull(),
  skillLevel: text("skill_level", {
    enum: ["beginner", "intermediate", "advanced"],
  }).notNull(),
  bestFor: text("best_for").notNull(),
  description: text("description").notNull(),
  imageHint: text("image_hint").notNull(),
});

/** Permanent owned inventory — not a trip pack. */
export const lockerItems = pgTable("locker_items", {
  id: serial("id").primaryKey(),
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
  priceUsd: doublePrecision("price_usd").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
  wornDefault: boolean("worn_default").notNull().default(false),
  consumableDefault: boolean("consumable_default").notNull().default(false),
  notes: text("notes").notNull().default(""),
  catalogItemId: integer("catalog_item_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trailId: integer("trail_id"),
  nights: integer("nights").notNull().default(2),
  season: text("season", {
    enum: ["spring", "summer", "fall", "winter", "shoulder"],
  })
    .notNull()
    .default("summer"),
  targetBaseWeightGrams: integer("target_base_weight_grams")
    .notNull()
    .default(4536),
  shareSlug: text("share_slug").notNull().unique(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/** Snapshotted gear on a trip pack (cloned from locker when added). */
export const tripItems = pgTable("trip_items", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  lockerItemId: integer("locker_item_id"),
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
  priceUsd: doublePrecision("price_usd").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
  worn: boolean("worn").notNull().default(false),
  consumable: boolean("consumable").notNull().default(false),
  maybe: boolean("maybe").notNull().default(false),
  notes: text("notes").notNull().default(""),
});

/** Community shakedown / pack share feed */
export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id"),
  shareSlug: text("share_slug").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  authorName: text("author_name").notNull(),
  trailName: text("trail_name").notNull().default(""),
  nights: integer("nights").notNull().default(0),
  season: text("season").notNull().default("summer"),
  baseWeightGrams: integer("base_weight_grams").notNull().default(0),
  packWeightGrams: integer("pack_weight_grams").notNull().default(0),
  itemCount: integer("item_count").notNull().default(0),
  clonesCount: integer("clones_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const communityComments = pgTable("community_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Trail = typeof trails.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type LockerItem = typeof lockerItems.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type TripItem = typeof tripItems.$inferSelect;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type CommunityComment = typeof communityComments.$inferSelect;
export type NewLockerItem = typeof lockerItems.$inferInsert;
export type NewTrip = typeof trips.$inferInsert;
export type NewTripItem = typeof tripItems.$inferInsert;
