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
  const items = await db
    .select()
    .from(tripItems)
    .where(eq(tripItems.tripId, trip.id))
    .orderBy(asc(tripItems.category), asc(tripItems.name));
  const trail = await getTrail(trip.trailId);
  const catalog = await db.select().from(catalogItems);
  const stats = computePackStats(tripItemsToPackable(items));
  const { checks, upgrades } = runGapChecks({
    gear: tripItemsToPackable(items),
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
