import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import { addComment, getCommunityPost } from "@/lib/community";

const commentSchema = z.object({
  authorName: z.string().min(1).max(60),
  body: z.string().min(1).max(2000),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  await seedIfEmpty();
  const postId = Number((await params).id);
  const parsed = commentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const comment = await addComment({ postId, ...parsed.data });
  if (!comment) {
    return NextResponse.json({ error: "Empty comment" }, { status: 400 });
  }
  const data = await getCommunityPost(postId);
  return NextResponse.json(data, { status: 201 });
}
