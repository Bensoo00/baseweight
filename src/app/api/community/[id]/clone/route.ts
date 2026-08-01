import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";
import { cloneCommunityPost } from "@/lib/community";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  await seedIfEmpty();
  const id = Number((await params).id);
  const trip = await cloneCommunityPost(id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ trip }, { status: 201 });
}
