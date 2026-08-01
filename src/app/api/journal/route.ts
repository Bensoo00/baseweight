import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import { requireUser } from "@/lib/auth";
import { createJournalEntry, listJournalEntries } from "@/lib/journal";

const gearNoteSchema = z.object({
  itemName: z.string().min(1).max(120),
  brand: z.string().max(80).optional(),
  category: z.string().max(40).optional(),
  verdict: z.enum(["worked", "mixed", "failed"]),
  note: z.string().max(500).optional(),
});

const createSchema = z.object({
  tripId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(140),
  trailName: z.string().max(120).optional(),
  rating: z.enum(["great", "ok", "rough"]).optional(),
  summary: z.string().max(2000).optional(),
  whatWorked: z.string().max(2000).optional(),
  whatDidnt: z.string().max(2000).optional(),
  happenedAt: z.string().max(32).optional(),
  gearNotes: z.array(gearNoteSchema).max(40).optional(),
});

export async function GET() {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;
  const entries = await listJournalEntries(user.id);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await createJournalEntry(user.id, parsed.data);
  if (!entry) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }
  return NextResponse.json({ entry }, { status: 201 });
}

export async function DELETE(request: Request) {
  await seedIfEmpty();
  const { user, error } = await requireUser();
  if (error) return error;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { deleteJournalEntry } = await import("@/lib/journal");
  const ok = await deleteJournalEntry(id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
