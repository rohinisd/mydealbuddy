import Link from "next/link";

export function PromoBanner({
  headline,
  subcopy,
  href,
  bg,
}: {
  headline: string;
  subcopy: string;
  href: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-md p-6" style={{ backgroundColor: bg }}>
      <div>
        <p className="text-lg font-bold text-text-primary">{headline}</p>
        <p className="mt-1 text-sm text-text-secondary">{subcopy}</p>
      </div>
      <Link
        href={href}
        className="btn-tracking mt-4 inline-block w-fit rounded-md bg-accent px-5 py-2 text-xs font-bold uppercase text-white hover:opacity-90"
      >
        Shop Now
      </Link>
    </div>
  );
}
