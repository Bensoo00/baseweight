import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import { userGear } from "@/db/schema";
import { CATEGORIES } from "@/lib/units";
import { computePackStats } from "@/lib/pack-stats";

const gearSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(80).optional().default(""),
  category: z.enum(CATEGORIES),
  weightGrams: z.number().int().positive().max(50000),
  priceUsd: z.number().min(0).max(20000).optional().default(0),
  quantity: z.number().int().positive().max(99).optional().default(1),
  worn: z.boolean().optional().default(false),
  consumable: z.boolean().optional().default(false),
  packed: z.boolean().optional().default(true),
  notes: z.string().max(500).optional().default(""),
  catalogItemId: z.number().int().optional().nullable(),
});

export async function GET() {
  await seedIfEmpty();
  const gear = await db.select().from(userGear).orderBy(desc(userGear.createdAt));
  return NextResponse.json({ gear, stats: computePackStats(gear) });
}

export async function POST(request: Request) {
  await seedIfEmpty();
  const body = await request.json();
  const parsed = gearSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const values = {
    ...parsed.data,
    createdAt: new Date().toISOString(),
  };

  const inserted = await db.insert(userGear).values(values).returning();
  return NextResponse.json({ gear: inserted[0] }, { status: 201 });
}

export async function PATCH(request: Request) {
  await seedIfEmpty();
  const body = await request.json();
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const updates: Partial<typeof userGear.$inferInsert> = {};
  if (typeof body.packed === "boolean") updates.packed = body.packed;
  if (typeof body.worn === "boolean") updates.worn = body.worn;
  if (typeof body.consumable === "boolean") updates.consumable = body.consumable;
  if (typeof body.quantity === "number") updates.quantity = body.quantity;

  const updated = await db
    .update(userGear)
    .set(updates)
    .where(eq(userGear.id, id))
    .returning();

  return NextResponse.json({ gear: updated[0] });
}

export async function DELETE(request: Request) {
  await seedIfEmpty();
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await db.delete(userGear).where(eq(userGear.id, id));
  return NextResponse.json({ ok: true });
}
