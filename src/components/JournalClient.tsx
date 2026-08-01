"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, BookOpen, Plus, Trash2 } from "lucide-react";
import type { JournalEntryDetail } from "@/lib/journal";

type PackOption = {
  id: number;
  name: string;
  items: Array<{
    name: string;
    brand: string;
    category: string;
  }>;
};

const ratings = [
  { id: "great", label: "Great trip" },
  { id: "ok", label: "Mixed" },
  { id: "rough", label: "Rough" },
] as const;

const verdicts = [
  { id: "worked", label: "Worked" },
  { id: "mixed", label: "Mixed" },
  { id: "failed", label: "Didn’t" },
] as const;

export function JournalClient({
  initialEntries,
  packs,
}: {
  initialEntries: JournalEntryDetail[];
  packs: PackOption[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    tripId: packs[0]?.id ? String(packs[0].id) : "",
    trailName: "",
    rating: "ok" as (typeof ratings)[number]["id"],
    summary: "",
    whatWorked: "",
    whatDidnt: "",
    happenedAt: new Date().toISOString().slice(0, 10),
  });
  const [gearVerdicts, setGearVerdicts] = useState<
    Record<string, { verdict: "worked" | "mixed" | "failed"; note: string }>
  >({});

  const selectedPack = useMemo(
    () => packs.find((p) => String(p.id) === form.tripId) ?? null,
    [packs, form.tripId],
  );

  async function refresh() {
    const res = await fetch("/api/journal");
    const data = await res.json();
    setEntries(data.entries ?? []);
  }

  function setVerdict(
    key: string,
    verdict: "worked" | "mixed" | "failed",
  ) {
    setGearVerdicts((prev) => ({
      ...prev,
      [key]: { verdict, note: prev[key]?.note ?? "" },
    }));
  }

  function submit() {
    startTransition(async () => {
      const gearNotes =
        selectedPack?.items
          .map((item) => {
            const key = `${item.brand}::${item.name}`;
            const v = gearVerdicts[key];
            if (!v) return null;
            return {
              itemName: item.name,
              brand: item.brand,
              category: item.category,
              verdict: v.verdict,
              note: v.note,
            };
          })
          .filter(Boolean) ?? [];

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tripId: form.tripId ? Number(form.tripId) : null,
          gearNotes,
        }),
      });
      if (!res.ok) return;
      setOpen(false);
      setGearVerdicts({});
      setForm((f) => ({
        ...f,
        title: "",
        summary: "",
        whatWorked: "",
        whatDidnt: "",
      }));
      await refresh();
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      await refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="max-w-xl text-sm text-ink-soft">
          After a trip, jot what worked and what didn’t — including per-item
          notes so the next pack is smarter.
        </p>
        <button
          type="button"
          className="pill pill-cta w-fit"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="arrow">
            <Plus size={14} />
          </span>
          New entry
        </button>
      </div>

      {open && (
        <div className="glass-card space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-semibold">Title</span>
              <input
                className="field"
                placeholder="JMT section — cold nights, heavy can"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Linked pack</span>
              <select
                className="field"
                value={form.tripId}
                onChange={(e) => {
                  setForm({ ...form, tripId: e.target.value });
                  setGearVerdicts({});
                }}
              >
                <option value="">No pack</option>
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Date</span>
              <input
                className="field"
                type="date"
                value={form.happenedAt}
                onChange={(e) =>
                  setForm({ ...form, happenedAt: e.target.value })
                }
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Trail / place</span>
              <input
                className="field"
                placeholder="John Muir Trail"
                value={form.trailName}
                onChange={(e) =>
                  setForm({ ...form, trailName: e.target.value })
                }
              />
            </label>
            <div className="space-y-2">
              <span className="text-sm font-semibold">Overall</span>
              <div className="flex flex-wrap gap-2">
                {ratings.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="chip"
                    data-active={form.rating === r.id}
                    onClick={() => setForm({ ...form, rating: r.id })}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">Trip summary</span>
            <textarea
              className="field"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Weather, miles, camp vibes…"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">What worked</span>
              <textarea
                className="field"
                value={form.whatWorked}
                onChange={(e) =>
                  setForm({ ...form, whatWorked: e.target.value })
                }
                placeholder="Quilt loft, filter flow, footwear…"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">What didn’t</span>
              <textarea
                className="field"
                value={form.whatDidnt}
                onChange={(e) =>
                  setForm({ ...form, whatDidnt: e.target.value })
                }
                placeholder="Pack hot spots, stove simmer, too much food…"
              />
            </label>
          </div>

          {selectedPack && selectedPack.items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen size={16} />
                Gear notes from this pack
              </div>
              <div className="space-y-2">
                {selectedPack.items.map((item) => {
                  const key = `${item.brand}::${item.name}`;
                  const current = gearVerdicts[key];
                  return (
                    <div
                      key={key}
                      className="glass-card-soft flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {item.brand ? `${item.brand} ` : ""}
                          {item.name}
                        </div>
                        <div className="text-xs capitalize text-ink-soft">
                          {item.category}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {verdicts.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            className="chip !px-2.5 !py-1 !text-xs"
                            data-active={current?.verdict === v.id}
                            onClick={() => setVerdict(key, v.id)}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            className="pill pill-cta"
            onClick={submit}
            disabled={pending || !form.title.trim()}
          >
            <span className="arrow">
              <ArrowRight size={14} />
            </span>
            {pending ? "Saving…" : "Save journal entry"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry, i) => (
          <article
            key={entry.id}
            className={`glass-card p-5 animate-rise animate-rise-delay-${(i % 3) + 1}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-soft">
                  {entry.happenedAt}
                  {entry.trailName ? ` · ${entry.trailName}` : ""}
                  {entry.packName ? ` · ${entry.packName}` : ""}
                </div>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">
                  {entry.title}
                </h3>
                <span className="mt-2 inline-flex rounded-full bg-white/35 px-2.5 py-0.5 text-xs capitalize">
                  {entry.rating}
                </span>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-ink-soft hover:bg-white/30 hover:text-ink"
                onClick={() => remove(entry.id)}
                aria-label="Delete entry"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {entry.summary && (
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {entry.summary}
              </p>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {entry.whatWorked && (
                <div className="glass-card-soft p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--signal-pass)]">
                    Worked
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed">
                    {entry.whatWorked}
                  </p>
                </div>
              )}
              {entry.whatDidnt && (
                <div className="glass-card-soft p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--signal-fail)]">
                    Didn’t
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed">
                    {entry.whatDidnt}
                  </p>
                </div>
              )}
            </div>

            {entry.gearNotes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {entry.gearNotes.map((note) => (
                  <span
                    key={note.id}
                    className="rounded-full border border-white/40 bg-white/25 px-3 py-1 text-xs"
                    title={note.note}
                  >
                    {note.itemName}{" "}
                    <span className="opacity-70">· {note.verdict}</span>
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}

        {entries.length === 0 && (
          <div className="glass-card-soft p-8 text-ink-soft">
            No journal entries yet. After your next trip, record what to keep and
            what to cut.
          </div>
        )}
      </div>
    </div>
  );
}
