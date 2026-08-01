import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";
import { cloneTripFromShare } from "@/lib/trips";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: Params) {
  await seedIfEmpty();
  const { slug } = await params;
  const trip = await cloneTripFromShare(slug);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ trip }, { status: 201 });
}
