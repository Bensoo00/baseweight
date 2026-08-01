import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import {
  createSession,
  createUser,
  findUserByEmail,
  toPublicUser,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email().max(120),
  name: z.string().min(1).max(60),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  await seedIfEmpty();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const user = await createUser(parsed.data);
  await createSession(user.id);
  return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
}
