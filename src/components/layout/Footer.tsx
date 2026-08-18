import Link from "next/link";
import { NAV_CATEGORIES } from "@/data/categories";

const CUSTOMER_POLICY_LINKS = [
  { label: "Contact Support", href: "/contact" },
  { label: "FAQ", href: "/faqs" },
  { label: "Track Order", href: "/track-order" },
  { label: "Returns & Refunds", href: "/returns" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cookie Policy", href: "/cookies-policy" },
];

const USEFUL_LINKS = [
  { label: "About Us", href: "/about-us" },
  { label: "Success Stories", href: "/success-stories" },
  { label: "Buddy Coins", href: "/account/buddy-coins" },
  { label: "Referrals", href: "/account/referrals" },
  { label: "All Stores", href: "/shop" },
];

const SOCIALS = ["Facebook", "X", "Instagram"];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface-grey">
      <div className="mx-auto max-w-[1280px] px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
              Online Shopping
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              {NAV_CATEGORIES.map((cat) => (
                <li key={cat.label}>
                  <Link href={cat.href} className="hover:text-accent">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
              Customer Policies
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              {CUSTOMER_POLICY_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
              Useful Links
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              {USEFUL_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">
              Stay in the loop
            </p>
            <p className="mb-3 text-sm text-text-secondary">
              Get the best deals dropped straight into your inbox.
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="btn-tracking shrink-0 rounded-md bg-accent px-4 py-2 text-xs font-bold uppercase text-white hover:opacity-90"
              >
                Join
              </button>
            </form>
            <div className="mt-4 flex gap-3 text-xs font-semibold text-text-secondary">
              {SOCIALS.map((s) => (
                <span key={s} className="rounded-full border border-border-strong px-3 py-1">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-text-muted md:flex-row">
          <p>© {new Date().getFullYear()} MyDealBuddy. Shop. Save. Earn. Share.</p>
          <p>Help.allinoneonline@gmail.com</p>
        </div>
      </div>
    </footer>
  );
}
