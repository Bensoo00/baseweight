import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import { cloneCommunityPost } from "@/lib/community";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const id = Number((await params).id);
  const trip = await cloneCommunityPost(id, user.id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ trip }, { status: 201 });
}
