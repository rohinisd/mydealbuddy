import Link from "next/link";
import { PRODUCT_CATEGORIES } from "@/data/categories";

const CATEGORY_COLORS = ["#dbe9fb", "#fdeccb", "#f6e9e0", "#fde8d8", "#e6e1fb", "#e5eef2"];

function initials(label: string): string {
  return label
    .split(" ")
    .filter((word) => /[a-z]/i.test(word))
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12">
      <h2 className="mb-6 text-xl font-semibold text-text-primary">Shop Product Categories</h2>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {PRODUCT_CATEGORIES.map((cat, i) => (
          <Link key={cat.slug} href={`/product-category/${cat.slug}`} className="group flex flex-col items-center gap-2 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-text-primary transition-transform group-hover:scale-105 sm:h-20 sm:w-20"
              style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
            >
              {initials(cat.label)}
            </span>
            <span className="text-xs font-medium text-text-secondary group-hover:text-accent sm:text-sm">{cat.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
