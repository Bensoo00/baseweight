import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import { createTrip, getTripDetail, listTrips } from "@/lib/trips";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  trailId: z.number().int().positive().nullable().optional(),
  nights: z.number().int().min(0).max(120).optional(),
  season: z.enum(["spring", "summer", "fall", "winter", "shoulder"]).optional(),
  targetBaseWeightGrams: z.number().int().positive().max(30000).optional(),
  notes: z.string().max(1000).optional(),
  seedFromLocker: z.boolean().optional(),
});

export async function GET() {
  await seedIfEmpty();
  const trips = await listTrips();
  const details = await Promise.all(trips.map((t) => getTripDetail(t.id)));
  return NextResponse.json({
    trips: details.filter(Boolean).map((d) => ({
      ...d!.trip,
      trail: d!.trail,
      stats: d!.stats,
      failCount: d!.checks.filter((c) => c.severity === "fail").length,
      warnCount: d!.checks.filter((c) => c.severity === "warn").length,
    })),
  });
}

export async function POST(request: Request) {
  await seedIfEmpty();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const detail = await createTrip(parsed.data);
  return NextResponse.json({ trip: detail }, { status: 201 });
}
