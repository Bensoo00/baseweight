import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lockerItems, tripItems, trips } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import {
  addCustomItemToTrip,
  addLockerItemsToTrip,
  getOwnedTripDetail,
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
  worn: z.boolean().optional(),
  consumable: z.boolean().optional(),
  maybe: z.boolean().optional(),
  quantity: z.number().int().min(0).max(99).optional(),
  category: z.enum(CATEGORIES).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const tripId = Number((await params).id);
  const owned = await getOwnedTripDetail(tripId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const custom = customItemSchema.safeParse(body);
  if (custom.success) {
    const detail = await addCustomItemToTrip(user.id, tripId, custom.data.item);
    return NextResponse.json(detail, { status: 201 });
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
  return NextResponse.json(await getOwnedTripDetail(tripId, user.id));
}

export async function PATCH(request: Request, { params }: Params) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const tripId = Number((await params).id);
  const owned = await getOwnedTripDetail(tripId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Partial<typeof tripItems.$inferInsert> = {};
  if (typeof parsed.data.worn === "boolean") updates.worn = parsed.data.worn;
  if (typeof parsed.data.consumable === "boolean") {
    updates.consumable = parsed.data.consumable;
  }
  if (typeof parsed.data.maybe === "boolean") updates.maybe = parsed.data.maybe;
  if (typeof parsed.data.quantity === "number") {
    updates.quantity = parsed.data.quantity;
  }
  if (parsed.data.category) updates.category = parsed.data.category;

  await db
    .update(tripItems)
    .set(updates)
    .where(
      and(eq(tripItems.id, parsed.data.id), eq(tripItems.tripId, tripId)),
    );
  await db
    .update(trips)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id)));

  return NextResponse.json(await getOwnedTripDetail(tripId, user.id));
}

export async function DELETE(request: Request, { params }: Params) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const tripId = Number((await params).id);
  const owned = await getOwnedTripDetail(tripId, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const itemId = Number(new URL(request.url).searchParams.get("itemId"));
  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }
  await db
    .delete(tripItems)
    .where(and(eq(tripItems.id, itemId), eq(tripItems.tripId, tripId)));
  await db
    .update(trips)
    .set({ updatedAt: new Date().toISOString() })
    .where(and(eq(trips.id, tripId), eq(trips.userId, user.id)));
  return NextResponse.json(await getOwnedTripDetail(tripId, user.id));
}
