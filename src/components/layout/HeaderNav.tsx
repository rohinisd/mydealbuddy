"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { SearchBar } from "@/components/layout/SearchBar";
import { BagIcon, ChevronDownIcon, MenuIcon, UserIcon, XIcon } from "@/components/icons/Icons";
import type { CategoryTop } from "@/lib/app-categories";

export function HeaderNav({ categories }: { categories: CategoryTop[] }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { totalCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      {/* Utility strip */}
      <div className="hidden bg-topbar text-white md:block">
        <div className="mx-auto flex max-w-[1280px] items-center justify-center gap-6 px-4 py-1.5 text-xs">
          <Link href="/quick-order" className="hover:opacity-80">Quick Order</Link>
          <span className="text-white/30">|</span>
          <Link href="/track-order" className="hover:opacity-80">Track Order</Link>
          <span className="text-white/30">|</span>
          <Link href="/account/buddy-coins" className="hover:opacity-80">Buddy Coins</Link>
          <span className="text-white/30">|</span>
          <Link href="/support" className="hover:opacity-80">24/7 Support</Link>
        </div>
      </div>

      {/* Main row: logo, search, account icons -- no category nav here, it's
          crammed and forces multi-word labels to wrap mid-name. Categories
          get their own full-width row below instead. */}
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileNavOpen((v) => !v)}
          className="text-accent md:hidden"
          aria-label="Open menu"
        >
          {mobileNavOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>

        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-accent">
          MyDealBuddy
        </Link>

        {/* Search */}
        <SearchBar
          outerClassName="relative ml-auto hidden max-w-md flex-1 md:block"
          inputClassName="w-full rounded-full border border-border-strong bg-surface-grey py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />

        {/* Icon actions */}
        <div className="ml-auto flex items-center gap-5 md:ml-0">
          <Link href="/my-account" className="hidden flex-col items-center text-text-secondary hover:text-accent md:flex">
            <UserIcon className="h-5 w-5" />
            <span className="text-[11px]">Profile</span>
          </Link>
          <Link href="/wishlist" className="hidden flex-col items-center text-text-secondary hover:text-accent md:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.3 4.5 5.7 4.1c2-.2 3.7.9 4.9 2.6a1 1 0 0 0 1.6 0c1.2-1.7 2.9-2.8 4.9-2.6 3.4.4 5.2 3.7 3.7 7.1-2.5 4.7-10 9.3-10 9.3z" />
            </svg>
            <span className="text-[11px]">Wishlist</span>
          </Link>
          <Link href="/cart" className="relative flex flex-col items-center text-text-secondary hover:text-accent">
            <BagIcon className="h-5 w-5" />
            {totalCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {totalCount}
              </span>
            )}
            <span className="hidden text-[11px] md:block">Bag</span>
          </Link>
        </div>
      </div>

      {/* Category bar: its own full-width row so 14 real category names have
          room to breathe. Each label stays on one line (whitespace-nowrap);
          the row itself wraps to a second line on narrower screens instead
          of forcing a horizontal scrollbar or shrinking to illegible text. */}
      <nav className="hidden border-t border-border md:block">
        <div className="mx-auto max-w-[1280px] px-4">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-xs font-semibold text-text-primary">
            {categories.map((top) => (
              <li key={top.id} className="group relative">
                <Link
                  href={`/product-category/${top.fullSlug}`}
                  className="flex items-center gap-1 whitespace-nowrap py-1 uppercase tracking-wide hover:text-accent"
                >
                  {top.name}
                  {top.groups.length > 0 && <ChevronDownIcon className="h-3 w-3 shrink-0" />}
                </Link>

                {top.groups.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-50 max-h-[70vh] w-[720px] translate-y-1 overflow-y-auto rounded-md border border-border bg-white p-6 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                      {top.groups.map((group) => (
                        <div key={group.id}>
                          <Link
                            href={`/product-category/${group.fullSlug}`}
                            className="mb-2 block text-xs font-bold uppercase text-text-muted hover:text-accent"
                          >
                            {group.name}
                          </Link>
                          <ul className="space-y-1.5">
                            {group.leaves.map((leaf) => (
                              <li key={leaf.id}>
                                <Link
                                  href={`/product-category/${leaf.fullSlug}`}
                                  className="text-sm font-normal normal-case text-text-secondary hover:text-accent"
                                >
                                  {leaf.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
            <li>
              <Link href="/deals" className="flex items-center gap-1 whitespace-nowrap py-1 uppercase tracking-wide hover:text-accent">
                Deals
                <span className="rounded-sm bg-discount px-1 text-[10px] font-bold text-white">HOT</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile search (always visible under main row on small screens) */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <SearchBar
          outerClassName="relative"
          inputClassName="w-full rounded-full border border-border-strong bg-surface-grey py-2 pl-9 pr-4 text-sm placeholder:text-text-muted focus:border-accent focus:outline-none"
          placeholder="Search products, categories and deals"
        />
      </div>

      {/* Mobile nav drawer -- top-level links only; each category's own page
          surfaces its groups/leaves for further drill-down on mobile. */}
      {mobileNavOpen && (
        <nav className="border-t border-border bg-white px-4 py-3 md:hidden">
          <ul className="space-y-3 text-sm font-semibold uppercase text-text-primary">
            {categories.map((top) => (
              <li key={top.id}>
                <Link href={`/product-category/${top.fullSlug}`} onClick={() => setMobileNavOpen(false)}>
                  {top.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/deals" onClick={() => setMobileNavOpen(false)}>
                Deals
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
