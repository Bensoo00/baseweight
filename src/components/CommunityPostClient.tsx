"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { CommunityComment, CommunityPost } from "@/db/schema";
import type { TripDetail } from "@/lib/trips";
import { CategoryBars } from "@/components/CategoryBars";
import { Weight } from "@/components/UnitProvider";
import { CATEGORIES, CATEGORY_LABELS, DEFAULT_CATEGORY_COLORS, type Category } from "@/lib/units";

export function CommunityPostClient({
  post,
  comments: initialComments,
  detail,
}: {
  post: CommunityPost;
  comments: CommunityComment[];
  detail: TripDetail | null;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const saved = window.localStorage.getItem("bw-author");
    if (saved) setAuthorName(saved);
  }, []);

  function submitComment() {
    startTransition(async () => {
      window.localStorage.setItem("bw-author", authorName.trim() || "Anonymous");
      const res = await fetch(`/api/community/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, body }),
      });
      if (res.status === 401) {
        router.push("/#account");
        return;
      }
      const data = await res.json();
      if (data.comments) {
        setComments(data.comments);
        setBody("");
      }
    });
  }

  function clonePack() {
    startTransition(async () => {
      const res = await fetch(`/api/community/${post.id}/clone`, {
        method: "POST",
      });
      if (res.status === 401) {
        router.push("/#account");
        return;
      }
      const data = await res.json();
      if (data.trip?.trip?.id) {
        router.push(`/trips/${data.trip.trip.id}`);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/community" className="text-sm text-ink-soft hover:text-ink">
          ← Community
        </Link>
        <div className="mt-3 text-xs uppercase tracking-wide text-ink-soft">
          {post.authorName}
          {post.trailName ? ` · ${post.trailName}` : ""} · {post.season}
        </div>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
          {post.title}
        </h1>
        {post.body && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
            {post.body}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="pill pill-cta"
            onClick={clonePack}
            disabled={pending}
          >
            <span className="arrow">
              <ArrowRight size={14} />
            </span>
            {pending ? "Cloning…" : "Clone this pack"}
          </button>
          <Link href={`/s/${post.shareSlug}`} className="pill pill-soft">
            Public share view
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <div className="text-sm text-ink-soft">Base weight</div>
          <div className="stat-number mt-2 text-3xl">
            <Weight grams={post.baseWeightGrams} />
          </div>
        </div>
        <div className="panel p-5">
          <div className="text-sm text-ink-soft">Pack weight (total − worn)</div>
          <div className="stat-number mt-2 text-3xl">
            <Weight grams={post.packWeightGrams} />
          </div>
        </div>
        <div className="panel p-5">
          <div className="text-sm text-ink-soft">Items · clones</div>
          <div className="stat-number mt-2 text-3xl">
            {post.itemCount}
            <span className="text-xl text-ink-soft"> · {post.clonesCount}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">The pack</h2>
          {detail ? (
            <>
              <div className="panel p-5">
                <div className="mb-4 text-sm font-semibold">
                  Category bars (not a pie chart)
                </div>
                <CategoryBars
                  rows={detail.stats.categoryBreakdown}
                  totalGrams={detail.stats.packWeightGrams}
                />
              </div>
              <div className="space-y-3">
                {CATEGORIES.map((cat) => {
                  const list = detail.items.filter((i) => i.category === cat);
                  if (!list.length) return null;
                  const grams = list.reduce(
                    (sum, i) => sum + i.weightGrams * i.quantity,
                    0,
                  );
                  return (
                    <div
                      key={cat}
                      className="category-section overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                        style={{
                          background:
                            DEFAULT_CATEGORY_COLORS[cat as Category] ??
                            "#4f5c54",
                          color: "#f4f1ea",
                        }}
                      >
                        <div className="font-semibold">
                          {CATEGORY_LABELS[cat]}
                        </div>
                        <div className="text-sm opacity-85">
                          {list.length} · <Weight grams={grams} />
                        </div>
                      </div>
                      <div className="divide-y divide-[var(--line)] bg-[rgba(22,24,30,0.45)]">
                        {list.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 px-4 py-2.5"
                          >
                            <div>
                              <div className="font-semibold">
                                {item.name}
                                {item.quantity > 1 && (
                                  <span className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-xs">
                                    ×{item.quantity}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-ink-soft">
                                {item.brand || "Unbranded"}
                                {item.worn ? " · Worn" : ""}
                                {item.consumable ? " · Consumable" : ""}
                              </div>
                            </div>
                            <div className="text-right font-semibold tabular-nums">
                              <Weight
                                grams={item.weightGrams * item.quantity}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="panel p-6 text-ink-soft">
              Pack snapshot unavailable, but you can still open the share link.
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2 font-semibold">
              <MessageCircle size={16} />
              Comments ({comments.length})
            </div>
            <div className="mt-4 space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl bg-[var(--paper-2)] px-4 py-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {comment.authorName}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{comment.body}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-ink-soft">No comments yet — start the shakedown.</p>
              )}
            </div>
            <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-4">
              <input
                className="field"
                placeholder="Display name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
              <textarea
                className="field min-h-24"
                placeholder="Weight cuts, trail tips, kind roasting…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <button
                type="button"
                className="pill pill-cta"
                onClick={submitComment}
                disabled={pending || !body.trim()}
              >
                Post comment
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
