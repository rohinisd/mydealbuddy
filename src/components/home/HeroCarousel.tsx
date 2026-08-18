"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Slide {
  pill: string;
  headline: string;
  subcopy: string;
  cta: string;
  href: string;
  bg: string;
}

const SLIDES: Slide[] = [
  {
    pill: "Trending Deals",
    headline: "Discover smart deals for everyday living",
    subcopy: "Beauty, home, pets, car accessories & more — all in one place.",
    cta: "Shop Now",
    href: "/shop",
    bg: "#eaf1f8",
  },
  {
    pill: "Deal of the Day",
    headline: "Up to 50% off electronics this week",
    subcopy: "Earbuds, power banks, smart watches — while stocks last.",
    cta: "Shop Electronics",
    href: "/product-category/electronics",
    bg: "#e7ecfb",
  },
  {
    pill: "New In",
    headline: "Fresh arrivals across every category",
    subcopy: "New this week, curated and ready to ship.",
    cta: "See What's New",
    href: "/shop",
    bg: "#fdeee0",
  },
];

const INTERVAL_MS = 5000;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: slide.bg }}>
      <div className="mx-auto max-w-[1280px] px-4 py-14 text-center transition-colors">
        <span className="inline-block rounded-full bg-discount px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {slide.pill}
        </span>
        <h1 className="mt-4 text-3xl font-bold text-text-primary md:text-4xl">{slide.headline}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">{slide.subcopy}</p>
        <Link
          href={slide.href}
          className="btn-tracking mt-6 inline-block rounded-md bg-accent px-8 py-3 text-sm font-bold uppercase text-white hover:opacity-90"
        >
          {slide.cta}
        </Link>
      </div>

      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.headline}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-accent" : "w-1.5 bg-text-muted/40"}`}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-text-primary shadow hover:bg-white sm:flex"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
        className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-text-primary shadow hover:bg-white sm:flex"
      >
        ›
      </button>
    </section>
  );
}
