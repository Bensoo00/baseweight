import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import { listCommunityPosts, publishTripToCommunity } from "@/lib/community";

const publishSchema = z.object({
  tripId: z.number().int().positive(),
  authorName: z.string().min(1).max(60),
  title: z.string().max(140).optional(),
  body: z.string().max(2000).optional(),
});

export async function GET() {
  await seedIfEmpty();
  const posts = await listCommunityPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  await seedIfEmpty();
  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const post = await publishTripToCommunity(parsed.data);
  if (!post) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  return NextResponse.json({ post }, { status: 201 });
}
