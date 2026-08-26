"use client";

import { useEffect, useRef, useState } from "react";
import { ShareIcon } from "@/components/icons/Icons";

export function ShareMenu({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleButtonClick() {
    // Prefer the native share sheet where it exists (mobile) -- falls back
    // to the dropdown of per-network links on desktop, where it's mostly
    // unsupported.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the native share sheet -- not an error.
      }
      return;
    }
    setOpen((o) => !o);
  }

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const networks = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X (Twitter)", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Email", href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleButtonClick}
        aria-label="Share"
        className={
          className ??
          "flex items-center justify-center rounded-md border border-border-strong px-3 py-2 text-text-secondary hover:border-accent hover:text-accent"
        }
      >
        <ShareIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md border border-border bg-white py-1 shadow-lg">
          {networks.map((n) => (
            <a
              key={n.label}
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-text-secondary hover:bg-surface-grey hover:text-text-primary"
            >
              {n.label}
            </a>
          ))}
          <button
            type="button"
            onClick={handleCopy}
            className="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface-grey hover:text-text-primary"
          >
            {copied ? "Copied ✓" : "Copy Link"}
          </button>
        </div>
      )}
    </div>
  );
}
