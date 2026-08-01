import { NextResponse } from "next/server";
import { ensureSchema } from "@/db";
import { requireUser } from "@/lib/auth";
import { duplicateTrip } from "@/lib/trips";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  await ensureSchema();
  const { user, error } = await requireUser();
  if (error) return error;

  const id = Number((await params).id);
  const trip = await duplicateTrip(id, user.id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ trip }, { status: 201 });
}
