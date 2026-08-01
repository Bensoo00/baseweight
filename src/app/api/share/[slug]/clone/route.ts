import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import { cloneTripFromShare } from "@/lib/trips";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: Params) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const { slug } = await params;
  const trip = await cloneTripFromShare(slug, user.id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ trip }, { status: 201 });
}
