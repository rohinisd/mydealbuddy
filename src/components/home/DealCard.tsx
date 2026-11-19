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
  // href is "#" until a real affiliate tracking link is pasted in from the
  // admin homepage editor -- a placeholder "#" with target="_blank" just
  // pops open a duplicate homepage tab, so render it as inert instead of a
  // working (but wrong) link.
  const isRealLink = href.trim() !== "" && href.trim() !== "#";

  return (
    <div className="flex w-64 shrink-0 snap-start flex-col rounded-md border border-border p-4 sm:w-72">
      <span className="inline-block w-fit rounded bg-deal px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
        Deal
      </span>
      <p className="mt-2 text-sm font-bold text-text-primary">{headline}</p>
      {subcopy && <p className="mt-1 flex-1 text-xs text-text-secondary">{subcopy}</p>}
      {isRealLink ? (
        <a
          href={href}
          rel="nofollow noopener"
          target="_blank"
          className="btn-tracking mt-3 inline-block rounded border border-dashed border-border-strong bg-surface-grey px-4 py-1.5 text-center text-xs font-semibold uppercase text-accent-ink hover:bg-white"
        >
          {cta || "Shop Now"}
        </a>
      ) : (
        <span
          aria-disabled="true"
          className="btn-tracking mt-3 inline-block cursor-default rounded border border-dashed border-border-strong bg-surface-grey px-4 py-1.5 text-center text-xs font-semibold uppercase text-text-muted opacity-60"
        >
          {cta || "Shop Now"}
        </span>
      )}
    </div>
  );
}
