import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  journalEntries,
  journalGearNotes,
  type JournalEntry,
  type JournalGearNote,
} from "@/db/schema";
import { getOwnedTripDetail } from "@/lib/trips";

export type JournalEntryDetail = JournalEntry & {
  gearNotes: JournalGearNote[];
  packName: string | null;
};

export async function listJournalEntries(
  userId: number,
): Promise<JournalEntryDetail[]> {
  const entries = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.happenedAt), desc(journalEntries.createdAt));

  const details: JournalEntryDetail[] = [];
  for (const entry of entries) {
    const gearNotes = await db
      .select()
      .from(journalGearNotes)
      .where(eq(journalGearNotes.entryId, entry.id));
    let packName: string | null = null;
    if (entry.tripId) {
      const pack = await getOwnedTripDetail(entry.tripId, userId);
      packName = pack?.trip.name ?? null;
    }
    details.push({ ...entry, gearNotes, packName });
  }
  return details;
}

export async function createJournalEntry(
  userId: number,
  input: {
    tripId?: number | null;
    title: string;
    trailName?: string;
    rating?: JournalEntry["rating"];
    summary?: string;
    whatWorked?: string;
    whatDidnt?: string;
    happenedAt?: string;
    gearNotes?: Array<{
      itemName: string;
      brand?: string;
      category?: string;
      verdict: JournalGearNote["verdict"];
      note?: string;
    }>;
  },
) {
  if (input.tripId) {
    const pack = await getOwnedTripDetail(input.tripId, userId);
    if (!pack) return null;
  }

  const [entry] = await db
    .insert(journalEntries)
    .values({
      userId,
      tripId: input.tripId ?? null,
      title: input.title.trim(),
      trailName: input.trailName?.trim() ?? "",
      rating: input.rating ?? "ok",
      summary: input.summary?.trim() ?? "",
      whatWorked: input.whatWorked?.trim() ?? "",
      whatDidnt: input.whatDidnt?.trim() ?? "",
      happenedAt:
        input.happenedAt?.trim() || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    })
    .returning();

  const notes = (input.gearNotes ?? []).filter((n) => n.itemName.trim());
  if (notes.length) {
    await db.insert(journalGearNotes).values(
      notes.map((n) => ({
        entryId: entry.id,
        itemName: n.itemName.trim(),
        brand: n.brand?.trim() ?? "",
        category: n.category ?? "other",
        verdict: n.verdict,
        note: n.note?.trim() ?? "",
      })),
    );
  }

  const list = await listJournalEntries(userId);
  return list.find((e) => e.id === entry.id) ?? null;
}

export async function deleteJournalEntry(id: number, userId: number) {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .limit(1);
  if (!rows[0]) return false;
  await db.delete(journalGearNotes).where(eq(journalGearNotes.entryId, id));
  await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
  return true;
}
