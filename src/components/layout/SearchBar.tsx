"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/icons/Icons";
import type { Product } from "@/types/product";

export function SearchBar({
  outerClassName,
  inputClassName,
  placeholder = "Search for products, brands and deals",
}: {
  outerClassName?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(term)}&limit=6`)
        .then((res) => res.json())
        .then((data: Product[]) => {
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults() {
    const term = query.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={outerClassName}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={inputClassName}
        />
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No products found.</p>
          ) : (
            <>
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {results.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-surface-grey"
                    >
                      <span
                        className="h-10 w-10 shrink-0 overflow-hidden rounded border border-border"
                        style={{ backgroundColor: product.swatch }}
                      >
                        {product.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-text-primary">{product.name}</span>
                        <span className="block text-xs font-semibold text-text-secondary">${product.price.toFixed(2)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToResults}
                className="block w-full border-t border-border px-3 py-2 text-center text-xs font-semibold uppercase text-accent hover:bg-surface-grey"
              >
                View all results for &ldquo;{query.trim()}&rdquo;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
