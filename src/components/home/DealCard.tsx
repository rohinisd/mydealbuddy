export function DealCard({
  headline,
  subcopy,
  cta,
  href,
}: {
  headline: string;
  subcopy?: string | null;
  cta?: string | null;
  href: string;
}) {
  return (
    <div className="flex w-64 shrink-0 snap-start flex-col rounded-md border border-border p-4 sm:w-72">
      <span className="inline-block w-fit rounded bg-deal px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
        Deal
      </span>
      <p className="mt-2 text-sm font-bold text-text-primary">{headline}</p>
      {subcopy && <p className="mt-1 flex-1 text-xs text-text-secondary">{subcopy}</p>}
      <a
        href={href}
        rel="nofollow noopener"
        target="_blank"
        className="btn-tracking mt-3 inline-block rounded border border-dashed border-border-strong bg-surface-grey px-4 py-1.5 text-center text-xs font-semibold uppercase text-accent-ink hover:bg-white"
      >
        {cta || "Shop Now"}
      </a>
    </div>
  );
}
