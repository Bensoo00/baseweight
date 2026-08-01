import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  communityComments,
  communityPosts,
  type CommunityComment,
  type CommunityPost,
} from "@/db/schema";
import {
  cloneTripFromShare,
  getOwnedTripDetail,
  getTripBySlug,
  getTripDetail,
} from "@/lib/trips";

export type CommunityPostWithMeta = CommunityPost & {
  commentCount: number;
};

export async function listCommunityPosts(): Promise<CommunityPostWithMeta[]> {
  const posts = await db
    .select()
    .from(communityPosts)
    .orderBy(desc(communityPosts.createdAt));

  const counts = await db
    .select({
      postId: communityComments.postId,
      value: sql<number>`count(*)`,
    })
    .from(communityComments)
    .groupBy(communityComments.postId);

  const countMap = new Map(counts.map((c) => [c.postId, Number(c.value)]));

  return posts.map((post) => ({
    ...post,
    commentCount: countMap.get(post.id) ?? 0,
  }));
}

export async function getCommunityPost(id: number) {
  const rows = await db
    .select()
    .from(communityPosts)
    .where(eq(communityPosts.id, id))
    .limit(1);
  const post = rows[0];
  if (!post) return null;

  const comments = await db
    .select()
    .from(communityComments)
    .where(eq(communityComments.postId, id))
    .orderBy(asc(communityComments.createdAt));

  let detail = post.tripId ? await getTripDetail(post.tripId) : null;
  if (!detail) {
    detail = await getTripBySlug(post.shareSlug);
  }

  return { post, comments, detail };
}

export async function publishTripToCommunity(input: {
  userId: number;
  tripId: number;
  authorName: string;
  title?: string;
  body?: string;
}) {
  const detail = await getOwnedTripDetail(input.tripId, input.userId);
  if (!detail) return null;

  const existing = await db
    .select()
    .from(communityPosts)
    .where(eq(communityPosts.tripId, input.tripId))
    .limit(1);

  const payload = {
    userId: input.userId,
    tripId: detail.trip.id,
    shareSlug: detail.trip.shareSlug,
    title: input.title?.trim() || detail.trip.name,
    body: input.body?.trim() || detail.trip.notes || "",
    authorName: input.authorName.trim() || "Anonymous",
    trailName: detail.trail?.name ?? "",
    nights: detail.trip.nights,
    season: detail.trip.season,
    baseWeightGrams: detail.stats.baseWeightGrams,
    packWeightGrams: detail.stats.packWeightGrams,
    itemCount: detail.stats.committedCount,
    createdAt: new Date().toISOString(),
  };

  if (existing[0]) {
    const [updated] = await db
      .update(communityPosts)
      .set(payload)
      .where(eq(communityPosts.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(communityPosts).values(payload).returning();
  return created;
}

/** Keep published community cards in sync when a pack changes. */
export async function syncCommunityPostForTrip(
  tripId: number,
  stats: {
    baseWeightGrams: number;
    packWeightGrams: number;
    committedCount: number;
  },
) {
  const existing = await db
    .select({ id: communityPosts.id })
    .from(communityPosts)
    .where(eq(communityPosts.tripId, tripId))
    .limit(1);
  if (!existing[0]) return;

  await db
    .update(communityPosts)
    .set({
      baseWeightGrams: stats.baseWeightGrams,
      packWeightGrams: stats.packWeightGrams,
      itemCount: stats.committedCount,
    })
    .where(eq(communityPosts.id, existing[0].id));
}

export async function addComment(input: {
  postId: number;
  userId: number;
  authorName: string;
  body: string;
}): Promise<CommunityComment | null> {
  const body = input.body.trim();
  if (!body) return null;
  const [comment] = await db
    .insert(communityComments)
    .values({
      postId: input.postId,
      userId: input.userId,
      authorName: input.authorName.trim() || "Anonymous",
      body,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return comment;
}

export async function cloneCommunityPost(postId: number, userId: number) {
  const rows = await db
    .select()
    .from(communityPosts)
    .where(eq(communityPosts.id, postId))
    .limit(1);
  const post = rows[0];
  if (!post) return null;

  const trip = await cloneTripFromShare(post.shareSlug, userId);
  if (!trip) return null;

  await db
    .update(communityPosts)
    .set({ clonesCount: post.clonesCount + 1 })
    .where(eq(communityPosts.id, postId));

  return trip;
}
