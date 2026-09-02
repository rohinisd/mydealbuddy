import Link from "next/link";

const TILE_COLORS = ["#dbe9fb", "#fdeccb", "#f6e9e0", "#fde8d8", "#e6e1fb", "#e5eef2"];

function initials(label: string): string {
  return label
    .split(" ")
    .filter((word) => /[a-z]/i.test(word))
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SubcategoryTiles({ items }: { items: { slug: string; name: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
      {items.map((item, i) => (
        <Link key={item.slug} href={`/product-category/${item.slug}`} className="group flex flex-col items-center gap-2 text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-text-primary transition-transform group-hover:scale-105 sm:h-20 sm:w-20"
            style={{ backgroundColor: TILE_COLORS[i % TILE_COLORS.length] }}
          >
            {initials(item.name)}
          </span>
          <span className="text-xs font-medium text-text-secondary group-hover:text-accent sm:text-sm">{item.name}</span>
        </Link>
      ))}
    </div>
  );
}
