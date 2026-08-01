import { NextResponse } from "next/server";
import { z } from "zod";
import { seedIfEmpty } from "@/db/seed";
import {
  createSession,
  findUserByEmail,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  await seedIfEmpty();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  await createSession(user.id);
  return NextResponse.json({ user: toPublicUser(user) });
}
