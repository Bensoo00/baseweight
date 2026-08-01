import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import { deleteTrip, getTripDetail, updateTrip } from "@/lib/trips";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  trailId: z.number().int().positive().nullable().optional(),
  nights: z.number().int().min(0).max(120).optional(),
  season: z.enum(["spring", "summer", "fall", "winter", "shoulder"]).optional(),
  targetBaseWeightGrams: z.number().int().positive().max(30000).optional(),
  notes: z.string().max(1000).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  await seedIfEmpty();
  const id = Number((await params).id);
  const detail = await getTripDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: Params) {
  await seedIfEmpty();
  const id = Number((await params).id);
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const detail = await updateTrip(id, parsed.data);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function DELETE(_request: Request, { params }: Params) {
  await seedIfEmpty();
  const id = Number((await params).id);
  await deleteTrip(id);
  return NextResponse.json({ ok: true });
}
