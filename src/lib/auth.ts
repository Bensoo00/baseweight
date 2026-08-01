import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type PublicUser, type User } from "@/db/schema";

export const SESSION_COOKIE = "bw_session";
const SESSION_DAYS = 30;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    userId,
    token: hashToken(token),
    expiresAt: expires.toISOString(),
    createdAt: new Date().toISOString(),
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });

  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, hashToken(token)));
  }
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date().toISOString();
  const rows = await db
    .select({ user: users, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);

  return rows[0]?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null as null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return user;
}
