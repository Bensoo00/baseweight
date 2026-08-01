import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogItems,
  lockerItems,
  trails,
  tripItems,
  trips,
  type LockerItem,
  type Trip,
  type TripItem,
} from "@/db/schema";
import { runGapChecks } from "@/lib/gap-checks";
import { shareSlug } from "@/lib/ids";
import {
  computePackStats,
  tripItemsToPackable,
  type PackStats,
} from "@/lib/pack-stats";
import type { GapCheck, UpgradeSuggestion } from "@/lib/gap-checks";

export type TripDetail = {
  trip: Trip;
  trail: Awaited<ReturnType<typeof getTrail>> | null;
  items: TripItem[];
  stats: PackStats;
  checks: GapCheck[];
  upgrades: UpgradeSuggestion[];
};

async function getTrail(trailId: number | null) {
  if (!trailId) return null;
  const rows = await db.select().from(trails).where(eq(trails.id, trailId)).limit(1);
  return rows[0] ?? null;
}

const catalogCache = globalThis as unknown as {
  __bwCatalog?: { at: number; rows: (typeof catalogItems.$inferSelect)[] };
};

async function getCatalogCached() {
  const hit = catalogCache.__bwCatalog;
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.rows;
  const rows = await db.select().from(catalogItems);
  catalogCache.__bwCatalog = { at: Date.now(), rows };
  return rows;
}

/** Fast ownership check — no items / gap-check work. */
export async function assertTripOwned(tripId: number, userId: number) {
  const rows = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);
  return Boolean(rows[0]);
}

export async function getTripItem(tripId: number, itemId: number) {
  const rows = await db
    .select()
    .from(tripItems)
    .where(and(eq(tripItems.id, itemId), eq(tripItems.tripId, tripId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Lightweight pack refresh after mutations (skips gap checks / catalog). */
export async function getTripItemsWithStats(tripId: number) {
  const items = await db
    .select()
    .from(tripItems)
    .where(eq(tripItems.tripId, tripId))
    .orderBy(asc(tripItems.category), asc(tripItems.name));
  const stats = computePackStats(tripItemsToPackable(items));
  return { items, stats };
}

export async function listTrips(userId: number) {
  return db
    .select()
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(desc(trips.updatedAt));
}

export async function getTripDetail(id: number): Promise<TripDetail | null> {
  const rows = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  const trip = rows[0];
  if (!trip) return null;
  return hydrateTrip(trip);
}

export async function getOwnedTripDetail(
  id: number,
  userId: number,
): Promise<TripDetail | null> {
  const rows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);
  const trip = rows[0];
  if (!trip) return null;
  return hydrateTrip(trip);
}

export async function getTripBySlug(slug: string): Promise<TripDetail | null> {
  const rows = await db
    .select()
    .from(trips)
    .where(eq(trips.shareSlug, slug))
    .limit(1);
  const trip = rows[0];
  if (!trip) return null;
  return hydrateTrip(trip);
}

async function hydrateTrip(trip: Trip): Promise<TripDetail> {
  const [items, trail, catalog] = await Promise.all([
    db
      .select()
      .from(tripItems)
      .where(eq(tripItems.tripId, trip.id))
      .orderBy(asc(tripItems.category), asc(tripItems.name)),
    getTrail(trip.trailId),
    getCatalogCached(),
  ]);
  const packable = tripItemsToPackable(items);
  const stats = computePackStats(packable);
  const { checks, upgrades } = runGapChecks({
    gear: packable,
    trail,
    nights: trip.nights,
    season: trip.season,
    targetBaseWeightGrams: trip.targetBaseWeightGrams,
    baseWeightGrams: stats.baseWeightGrams,
    catalog,
  });
  return { trip, trail, items, stats, checks, upgrades };
}

export async function createTrip(
  userId: number,
  input: {
    name: string;
    trailId?: number | null;
    nights?: number;
    season?: Trip["season"];
    targetBaseWeightGrams?: number;
    notes?: string;
    seedFromLocker?: boolean;
  },
) {
  const now = new Date().toISOString();
  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      name: input.name,
      trailId: input.trailId ?? null,
      nights: input.nights ?? 2,
      season: input.season ?? "summer",
      targetBaseWeightGrams: input.targetBaseWeightGrams ?? 4536,
      shareSlug: shareSlug(),
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (input.seedFromLocker) {
    const locker = await db
      .select()
      .from(lockerItems)
      .where(eq(lockerItems.userId, userId));
    if (locker.length) {
      await addLockerItemsToTrip(trip.id, locker);
    }
  }

  return getTripDetail(trip.id);
}

export async function updateTrip(
  id: number,
  userId: number,
  patch: Partial<
    Pick<
      Trip,
      | "name"
      | "trailId"
      | "nights"
      | "season"
      | "targetBaseWeightGrams"
      | "notes"
    >
  >,
) {
  const owned = await getOwnedTripDetail(id, userId);
  if (!owned) return null;
  await db
    .update(trips)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(and(eq(trips.id, id), eq(trips.userId, userId)));
  return getTripDetail(id);
}

export async function deleteTrip(id: number, userId: number) {
  const owned = await getOwnedTripDetail(id, userId);
  if (!owned) return false;
  await db.delete(tripItems).where(eq(tripItems.tripId, id));
  await db
    .delete(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)));
  return true;
}

export async function addLockerItemsToTrip(
  tripId: number,
  items: LockerItem[],
) {
  if (!items.length) return;
  await db.insert(tripItems).values(
    items.map((item) => ({
      tripId,
      lockerItemId: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      weightGrams: item.weightGrams,
      priceUsd: item.priceUsd,
      quantity: item.quantity,
      worn: item.wornDefault,
      consumable: item.consumableDefault,
      notes: item.notes,
    })),
  );
  await db
    .update(trips)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(trips.id, tripId));
}

export async function addCustomItemToTrip(
  userId: number,
  tripId: number,
  input: {
    name: string;
    brand?: string;
    category: LockerItem["category"];
    weightGrams: number;
    priceUsd?: number;
    quantity?: number;
    worn?: boolean;
    consumable?: boolean;
    notes?: string;
    alsoAddToLocker?: boolean;
  },
) {
  if (!(await assertTripOwned(tripId, userId))) return null;

  let lockerItemId: number | null = null;
  if (input.alsoAddToLocker) {
    const [lockerItem] = await db
      .insert(lockerItems)
      .values({
        userId,
        name: input.name,
        brand: input.brand ?? "",
        category: input.category,
        weightGrams: input.weightGrams,
        priceUsd: input.priceUsd ?? 0,
        quantity: input.quantity ?? 1,
        wornDefault: input.worn ?? false,
        consumableDefault: input.consumable ?? false,
        notes: input.notes ?? "",
        createdAt: new Date().toISOString(),
      })
      .returning();
    lockerItemId = lockerItem.id;
  }

  await db.insert(tripItems).values({
    tripId,
    lockerItemId,
    name: input.name,
    brand: input.brand ?? "",
    category: input.category,
    weightGrams: input.weightGrams,
    priceUsd: input.priceUsd ?? 0,
    quantity: input.quantity ?? 1,
    worn: input.worn ?? false,
    consumable: input.consumable ?? false,
    notes: input.notes ?? "",
  });
  await db
    .update(trips)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(trips.id, tripId));

  return getTripItemsWithStats(tripId);
}

export async function addCatalogToLockerAndTrip(options: {
  userId: number;
  tripId?: number;
  name: string;
  brand: string;
  category: LockerItem["category"];
  weightGrams: number;
  priceUsd: number;
  catalogItemId?: number;
  notes?: string;
}) {
  const [lockerItem] = await db
    .insert(lockerItems)
    .values({
      userId: options.userId,
      name: options.name,
      brand: options.brand,
      category: options.category,
      weightGrams: options.weightGrams,
      priceUsd: options.priceUsd,
      quantity: 1,
      wornDefault: false,
      consumableDefault: false,
      notes: options.notes ?? "",
      catalogItemId: options.catalogItemId ?? null,
      createdAt: new Date().toISOString(),
    })
    .returning();

  if (options.tripId) {
    await addLockerItemsToTrip(options.tripId, [lockerItem]);
  }

  return lockerItem;
}

export async function cloneTripFromShare(slug: string, userId: number) {
  const source = await getTripBySlug(slug);
  if (!source) return null;
  const now = new Date().toISOString();
  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      name: `${source.trip.name} (copy)`,
      trailId: source.trip.trailId,
      nights: source.trip.nights,
      season: source.trip.season,
      targetBaseWeightGrams: source.trip.targetBaseWeightGrams,
      shareSlug: shareSlug(),
      notes: source.trip.notes,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (source.items.length) {
    await db.insert(tripItems).values(
      source.items.map((item) => ({
        tripId: trip.id,
        lockerItemId: null,
        name: item.name,
        brand: item.brand,
        category: item.category,
        weightGrams: item.weightGrams,
        priceUsd: item.priceUsd,
        quantity: item.quantity,
        worn: item.worn,
        consumable: item.consumable,
        notes: item.notes,
      })),
    );
  }

  return getTripDetail(trip.id);
}
