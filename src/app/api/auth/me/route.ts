import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/db/seed";
import { getCurrentUser, toPublicUser } from "@/lib/auth";

export async function GET() {
  await seedIfEmpty();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: toPublicUser(user) });
}
