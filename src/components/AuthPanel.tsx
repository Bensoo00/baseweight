"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { PublicUser } from "@/db/schema";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

type Mode = "login" | "register";

export function AuthPanel({ user }: { user: PublicUser | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not sign in. Check your details.",
        );
        return;
      }
      router.refresh();
    });
  }

  function logout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
    });
  }

  if (user) {
    return (
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <p className="text-sm text-ink-soft">Signed in as</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {user.name}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            Your locker and trip packs stay private to this account. Community
            posts stay public.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <a href="#packs" className="pill pill-cta">
            <span className="arrow">
              <ArrowRight size={14} />
            </span>
            Open packs
          </a>
          <button
            type="button"
            className="pill pill-ghost"
            onClick={logout}
            disabled={pending}
          >
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">
          Create an account so your locker and trip packs live in Postgres under
          your user. Or try the demo:
        </p>
        <p className="mt-4 font-mono text-sm text-ink">
          {DEMO_EMAIL} / {DEMO_PASSWORD}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="rounded-full px-3 py-1.5 text-sm capitalize transition"
              style={{
                background: mode === m ? "var(--ink)" : "transparent",
                color: mode === m ? "white" : "var(--ink-soft)",
              }}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink-soft">
              Name
            </span>
            <input
              className="field"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              autoComplete="name"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink-soft">
            Email
          </span>
          <input
            className="field"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink-soft">
            Password
          </span>
          <input
            className="field"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={mode === "register" ? 8 : 1}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button type="submit" className="pill pill-cta" disabled={pending}>
          <span className="arrow">
            <ArrowRight size={14} />
          </span>
          {pending
            ? "Working…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}

export function AuthGate({
  user,
  children,
  message,
}: {
  user: PublicUser | null;
  children: React.ReactNode;
  message: string;
}) {
  if (user) return <>{children}</>;
  return (
    <div className="glass-card-soft px-5 py-8 text-center">
      <p className="text-sm text-ink-soft">{message}</p>
      <a href="#account" className="pill pill-cta mt-5 inline-flex">
        <span className="arrow">
          <ArrowRight size={14} />
        </span>
        Sign in to continue
      </a>
    </div>
  );
}
