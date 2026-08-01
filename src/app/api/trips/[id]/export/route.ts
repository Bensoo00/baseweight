import { NextResponse } from "next/server";
import { ensureSchema } from "@/db";
import { requireUser } from "@/lib/auth";
import { toLighterpackCsv } from "@/lib/lighterpack-csv";
import { getOwnedTripDetail } from "@/lib/trips";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  await ensureSchema();
  const { user, error } = await requireUser();
  if (error) return error;

  const id = Number((await params).id);
  const detail = await getOwnedTripDetail(id, user.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const csv = toLighterpackCsv(detail.items);
  const safeName = detail.trip.name
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "pack"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
