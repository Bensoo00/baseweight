import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lockerItems, tripItems, trips } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { addLockerItemsToTrip, getTripDetail } from "@/lib/trips";

const addSchema = z.object({
  lockerItemIds: z.array(z.number().int().positive()).min(1),
});

const patchSchema = z.object({
  id: z.number().int().positive(),
  worn: z.boolean().optional(),
  consumable: z.boolean().optional(),
  maybe: z.boolean().optional(),
  quantity: z.number().int().min(0).max(99).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  await seedIfEmpty();
  const tripId = Number((await params).id);
  const parsed = addSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const items = await db
    .select()
    .from(lockerItems)
    .where(inArray(lockerItems.id, parsed.data.lockerItemIds));

  await addLockerItemsToTrip(tripId, items);
  const detail = await getTripDetail(tripId);
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: Params) {
  await seedIfEmpty();
  const tripId = Number((await params).id);
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

  await db
    .update(tripItems)
    .set(updates)
    .where(
      and(eq(tripItems.id, parsed.data.id), eq(tripItems.tripId, tripId)),
    );
  await db
    .update(trips)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(trips.id, tripId));

  return NextResponse.json(await getTripDetail(tripId));
}

export async function DELETE(request: Request, { params }: Params) {
  await seedIfEmpty();
  const tripId = Number((await params).id);
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
    .where(eq(trips.id, tripId));
  return NextResponse.json(await getTripDetail(tripId));
}
