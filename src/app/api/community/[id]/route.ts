import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";
import { getCommunityPost } from "@/lib/community";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  await seedIfEmpty();
  const id = Number((await params).id);
  const data = await getCommunityPost(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
