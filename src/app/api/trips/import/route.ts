import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lockerItems, tripItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import { parseLighterpackCsv } from "@/lib/lighterpack-csv";
import { createTrip, getTripDetail } from "@/lib/trips";

const schema = z.object({
  csv: z.string().min(1).max(2_000_000),
  name: z.string().max(120).optional(),
  alsoAddToLocker: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, warnings } = parseLighterpackCsv(parsed.data.csv);
  if (!items.length) {
    return NextResponse.json(
      { error: "No items found in CSV.", warnings },
      { status: 400 },
    );
  }

  const packName =
    parsed.data.name?.trim() ||
    `Imported pack (${items.length} items)`;

  const detail = await createTrip(user.id, {
    name: packName,
    nights: 0,
    seedFromLocker: false,
  });
  if (!detail) {
    return NextResponse.json({ error: "Could not create pack" }, { status: 500 });
  }

  const tripId = detail.trip.id;
  let lockerLinks: Array<number | null> = items.map(() => null);

  if (parsed.data.alsoAddToLocker) {
    const inserted = await db
      .insert(lockerItems)
      .values(
        items.map((item) => ({
          userId: user.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          weightGrams: item.weightGrams,
          priceUsd: item.priceUsd,
          quantity: item.quantity,
          wornDefault: item.worn,
          consumableDefault: item.consumable,
          notes: item.notes,
          createdAt: new Date().toISOString(),
        })),
      )
      .returning();
    lockerLinks = inserted.map((row) => row.id);
  }

  await db.insert(tripItems).values(
    items.map((item, i) => ({
      tripId,
      lockerItemId: lockerLinks[i],
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

  const full = await getTripDetail(tripId);
  return NextResponse.json(
    {
      trip: full,
      imported: items.length,
      warnings,
    },
    { status: 201 },
  );
}
