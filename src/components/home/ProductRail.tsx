import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types/product";

export function ProductRail({
  pillLabel,
  title,
  viewAllHref,
  products,
}: {
  pillLabel: string;
  title: string;
  viewAllHref?: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-8">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <span className="inline-block rounded-full bg-discount px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {pillLabel}
          </span>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">{title}</h2>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-accent hover:underline">
            View all →
          </Link>
        )}
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto pb-2">
        {products.map((product) => (
          <div key={product.id} className="w-40 shrink-0 snap-start sm:w-48">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
