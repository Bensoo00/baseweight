import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import { CATEGORIES } from "@/lib/units";
import { listTrails, recommendGear } from "@/lib/recommend";

const querySchema = z.object({
  budget: z.coerce.number().positive().optional(),
  maxWeightOz: z.coerce.number().positive().optional(),
  trailId: z.coerce.number().int().positive().optional(),
  category: z.enum(CATEGORIES).optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  prioritize: z.enum(["weight", "value", "comfort", "durability"]).optional(),
});

export async function GET(request: Request) {
  await seedIfEmpty();
  const { searchParams } = new URL(request.url);

  if (searchParams.get("meta") === "trails") {
    const trails = await listTrails();
    return NextResponse.json({ trails });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const maxWeightGrams = parsed.data.maxWeightOz
    ? Math.round(parsed.data.maxWeightOz * 28.3495)
    : undefined;

  const result = await recommendGear({
    budget: parsed.data.budget,
    maxWeightGrams,
    trailId: parsed.data.trailId,
    category: parsed.data.category,
    skillLevel: parsed.data.skillLevel,
    prioritize: parsed.data.prioritize,
  });

  return NextResponse.json(result);
}
