"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_CATEGORIES } from "@/data/categories";
import { useCart } from "@/context/CartContext";
import { SearchBar } from "@/components/layout/SearchBar";
import {
  BagIcon,
  ChevronDownIcon,
  MenuIcon,
  UserIcon,
  XIcon,
} from "@/components/icons/Icons";

export function Header() {
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

      {/* Main row */}
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

        {/* Desktop mega-menu nav */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-5 text-sm font-semibold text-text-primary">
            {NAV_CATEGORIES.map((cat) => (
              <li key={cat.label} className="group relative py-4">
                <Link
                  href={cat.href}
                  className="flex items-center gap-1 uppercase tracking-wide hover:text-accent"
                >
                  {cat.label}
                  {cat.hot && (
                    <span className="rounded-sm bg-discount px-1 text-[10px] font-bold text-white">
                      HOT
                    </span>
                  )}
                  {cat.columns && <ChevronDownIcon className="h-3.5 w-3.5" />}
                </Link>

                {cat.columns && (
                  <div className="invisible absolute left-1/2 top-full z-50 w-[560px] -translate-x-1/2 translate-y-1 rounded-md border border-border bg-white p-6 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="grid grid-cols-2 gap-6">
                      {cat.columns.map((col) => (
                        <div key={col.heading}>
                          <p className="mb-2 text-xs font-bold uppercase text-text-muted">
                            {col.heading}
                          </p>
                          <ul className="space-y-1.5">
                            {col.items.map((item) => (
                              <li key={item}>
                                <Link
                                  href={cat.href}
                                  className="text-sm font-normal normal-case text-text-secondary hover:text-accent"
                                >
                                  {item}
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
          </ul>
        </nav>

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

      {/* Mobile search (always visible under main row on small screens) */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <SearchBar
          outerClassName="relative"
          inputClassName="w-full rounded-full border border-border-strong bg-surface-grey py-2 pl-9 pr-4 text-sm placeholder:text-text-muted focus:border-accent focus:outline-none"
          placeholder="Search products, categories and deals"
        />
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <nav className="border-t border-border bg-white px-4 py-3 md:hidden">
          <ul className="space-y-3 text-sm font-semibold uppercase text-text-primary">
            {NAV_CATEGORIES.map((cat) => (
              <li key={cat.label}>
                <Link href={cat.href} onClick={() => setMobileNavOpen(false)}>
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
