import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lockerItems } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { CATEGORIES } from "@/lib/units";

const lockerSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(80).optional().default(""),
  category: z.enum(CATEGORIES),
  weightGrams: z.number().int().positive().max(50000),
  priceUsd: z.number().min(0).max(20000).optional().default(0),
  quantity: z.number().int().positive().max(99).optional().default(1),
  wornDefault: z.boolean().optional().default(false),
  consumableDefault: z.boolean().optional().default(false),
  notes: z.string().max(500).optional().default(""),
  catalogItemId: z.number().int().optional().nullable(),
});

export async function GET() {
  await seedIfEmpty();
  const items = await db
    .select()
    .from(lockerItems)
    .orderBy(desc(lockerItems.createdAt));
  const totalGrams = items.reduce(
    (sum, i) => sum + i.weightGrams * i.quantity,
    0,
  );
  const totalValueUsd = items.reduce(
    (sum, i) => sum + i.priceUsd * i.quantity,
    0,
  );
  return NextResponse.json({
    items,
    summary: {
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      totalGrams,
      totalValueUsd,
    },
  });
}

export async function POST(request: Request) {
  await seedIfEmpty();
  const parsed = lockerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const [item] = await db
    .insert(lockerItems)
    .values({ ...parsed.data, createdAt: new Date().toISOString() })
    .returning();
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(request: Request) {
  await seedIfEmpty();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await db.delete(lockerItems).where(eq(lockerItems.id, id));
  return NextResponse.json({ ok: true });
}
