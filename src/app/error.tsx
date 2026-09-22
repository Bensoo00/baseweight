"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
        Server error
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Database isn’t reachable
      </h1>
      <p className="text-sm leading-relaxed text-ink-soft">
        Almost every outage here is a missing or broken{" "}
        <code className="text-ink">DATABASE_URL</code>. In Vercel → Settings →
        Environment Variables, set it to your Neon or Render Postgres URL
        (with <code className="text-ink">sslmode=require</code>), then Redeploy.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-ink-soft">ERROR {error.digest}</p>
      )}
      <button type="button" className="pill pill-cta w-fit" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
