import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

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
  userId: integer("user_id").notNull(),
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
  userId: integer("user_id").notNull(),
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
  userId: integer("user_id"),
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
  userId: integer("user_id"),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/** Post-trip journal — what worked / didn’t with optional gear notes. */
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tripId: integer("trip_id"),
  title: text("title").notNull(),
  trailName: text("trail_name").notNull().default(""),
  rating: text("rating", {
    enum: ["great", "ok", "rough"],
  })
    .notNull()
    .default("ok"),
  summary: text("summary").notNull().default(""),
  whatWorked: text("what_worked").notNull().default(""),
  whatDidnt: text("what_didnt").notNull().default(""),
  happenedAt: text("happened_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString().slice(0, 10)),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const journalGearNotes = pgTable("journal_gear_notes", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  itemName: text("item_name").notNull(),
  brand: text("brand").notNull().default(""),
  category: text("category").notNull().default("other"),
  verdict: text("verdict", {
    enum: ["worked", "mixed", "failed"],
  }).notNull(),
  note: text("note").notNull().default(""),
});

export type User = typeof users.$inferSelect;
export type PublicUser = Pick<User, "id" | "email" | "name" | "createdAt">;
export type Trail = typeof trails.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type LockerItem = typeof lockerItems.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type TripItem = typeof tripItems.$inferSelect;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type CommunityComment = typeof communityComments.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalGearNote = typeof journalGearNotes.$inferSelect;
export type NewLockerItem = typeof lockerItems.$inferInsert;
export type NewTrip = typeof trips.$inferInsert;
export type NewTripItem = typeof tripItems.$inferInsert;
