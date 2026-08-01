import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureSchema } from "@/db";
import { lockerItems, tripItems, trips } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  addCustomItemToTrip,
  addLockerItemsToTrip,
  assertTripOwned,
  getTripItem,
  getTripItemsWithStats,
} from "@/lib/trips";
import { CATEGORIES } from "@/lib/units";

const fromLockerSchema = z.object({
  lockerItemIds: z.array(z.number().int().positive()).min(1),
});

const customItemSchema = z.object({
  item: z.object({
    name: z.string().min(1).max(120),
    brand: z.string().max(80).optional().default(""),
    category: z.enum(CATEGORIES),
    weightGrams: z.number().int().positive().max(50000),
    priceUsd: z.number().min(0).max(20000).optional().default(0),
    quantity: z.number().int().positive().max(99).optional().default(1),
    worn: z.boolean().optional().default(false),
    consumable: z.boolean().optional().default(false),
    notes: z.string().max(500).optional().default(""),
    alsoAddToLocker: z.boolean().optional().default(false),
  }),
});

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120).optional(),
  brand: z.string().max(80).optional(),
  weightGrams: z.number().int().positive().max(50000).optional(),
  priceUsd: z.number().min(0).max(20000).optional(),
  notes: z.string().max(500).optional(),
  worn: z.boolean().optional(),
  consumable: z.boolean().optional(),
  maybe: z.boolean().optional(),
  quantity: z.number().int().min(0).max(99).optional(),
  category: z.enum(CATEGORIES).optional(),
  syncLocker: z.boolean().optional().default(true),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  await ensureSchema();
  const { user, error } = await requireUser();
  if (error) return error;

  const tripId = Number((await params).id);
  if (!(await assertTripOwned(tripId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const custom = customItemSchema.safeParse(body);
  if (custom.success) {
    await addCustomItemToTrip(user.id, tripId, custom.data.item);
    const light = await getTripItemsWithStats(tripId);
    return NextResponse.json(
      { ...light, lockerSynced: Boolean(custom.data.item.alsoAddToLocker) },
      { status: 201 },
    );
  }

  const fromLocker = fromLockerSchema.safeParse(body);
  if (!fromLocker.success) {
    return NextResponse.json(
      { error: "Provide lockerItemIds or item." },
      { status: 400 },
    );
  }

  const items = await db
    .select()
    .from(lockerItems)
    .where(
      and(
        eq(lockerItems.userId, user.id),
        inArray(lockerItems.id, fromLocker.data.lockerItemIds),
      ),
    );

  await addLockerItemsToTrip(tripId, items);
  return NextResponse.json(await getTripItemsWithStats(tripId));
}

export async function PATCH(request: Request, { params }: Params) {
  await ensureSchema();
  const { user, error } = await requireUser();
  if (error) return error;

  const tripId = Number((await params).id);
  if (!(await assertTripOwned(tripId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getTripItem(tripId, parsed.data.id);
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const updates: Partial<typeof tripItems.$inferInsert> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (typeof parsed.data.brand === "string") updates.brand = parsed.data.brand;
  if (typeof parsed.data.weightGrams === "number") {
    updates.weightGrams = parsed.data.weightGrams;
  }
  if (typeof parsed.data.priceUsd === "number") {
    updates.priceUsd = parsed.data.priceUsd;
  }
  if (typeof parsed.data.notes === "string") updates.notes = parsed.data.notes;
  if (typeof parsed.data.worn === "boolean") updates.worn = parsed.data.worn;
  if (typeof parsed.data.consumable === "boolean") {
    updates.consumable = parsed.data.consumable;
  }
  if (typeof parsed.data.maybe === "boolean") updates.maybe = parsed.data.maybe;
  if (typeof parsed.data.quantity === "number") {
    updates.quantity = parsed.data.quantity;
  }
  if (parsed.data.category) updates.category = parsed.data.category;

  const writeJobs: Promise<unknown>[] = [
    db
      .update(tripItems)
      .set(updates)
      .where(
        and(eq(tripItems.id, parsed.data.id), eq(tripItems.tripId, tripId)),
      ),
    db
      .update(trips)
      .set({ updatedAt: new Date().toISOString() })
      .where(and(eq(trips.id, tripId), eq(trips.userId, user.id))),
  ];

  let lockerSynced = false;
  if (
    parsed.data.syncLocker !== false &&
    existing.lockerItemId &&
    Object.keys(updates).length > 0
  ) {
    const lockerUpdates: Partial<typeof lockerItems.$inferInsert> = {};
    if (updates.name) lockerUpdates.name = updates.name;
    if (typeof updates.brand === "string") lockerUpdates.brand = updates.brand;
    if (typeof updates.weightGrams === "number") {
      lockerUpdates.weightGrams = updates.weightGrams;
    }
    if (typeof updates.priceUsd === "number") {
      lockerUpdates.priceUsd = updates.priceUsd;
    }
    if (typeof updates.notes === "string") lockerUpdates.notes = updates.notes;
    if (typeof updates.quantity === "number" && updates.quantity > 0) {
      lockerUpdates.quantity = updates.quantity;
    }
    if (updates.category) lockerUpdates.category = updates.category;
    if (typeof updates.worn === "boolean") {
      lockerUpdates.wornDefault = updates.worn;
    }
    if (typeof updates.consumable === "boolean") {
      lockerUpdates.consumableDefault = updates.consumable;
    }

    if (Object.keys(lockerUpdates).length) {
      writeJobs.push(
        db
          .update(lockerItems)
          .set(lockerUpdates)
          .where(
            and(
              eq(lockerItems.id, existing.lockerItemId),
              eq(lockerItems.userId, user.id),
            ),
          ),
      );
      lockerSynced = true;
    }
  }

  await Promise.all(writeJobs);
  const light = await getTripItemsWithStats(tripId);
  return NextResponse.json({ ...light, lockerSynced });
}

export async function DELETE(request: Request, { params }: Params) {
  await ensureSchema();
  const { user, error } = await requireUser();
  if (error) return error;

  const tripId = Number((await params).id);
  if (!(await assertTripOwned(tripId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const itemId = Number(new URL(request.url).searchParams.get("itemId"));
  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }
  await Promise.all([
    db
      .delete(tripItems)
      .where(and(eq(tripItems.id, itemId), eq(tripItems.tripId, tripId))),
    db
      .update(trips)
      .set({ updatedAt: new Date().toISOString() })
      .where(and(eq(trips.id, tripId), eq(trips.userId, user.id))),
  ]);
  return NextResponse.json(await getTripItemsWithStats(tripId));
}
