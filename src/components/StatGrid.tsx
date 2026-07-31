export function StatGrid({
  items,
}: {
  items: { value: string; label: string; detail: string }[];
}) {
  return (
    <div className="grid gap-8 border-t border-black/8 pt-8 md:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`animate-rise animate-rise-delay-${index + 1}`}
        >
          <div className="stat-number text-ink">{item.value}</div>
          <div className="mt-3 text-base font-semibold text-ink">{item.label}</div>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
            {item.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
