"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/plp/Breadcrumb";

const NAV_LINKS = [
  { label: "Overview", href: "/my-account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Buddy Coins", href: "/account/buddy-coins" },
  { label: "Referrals", href: "/account/referrals" },
];

const COMING_SOON = ["Addresses", "Coupons", "Profile", "Saved Payments"];

export function AccountLayout({
  title,
  customerFirstName,
  children,
}: {
  title: string;
  customerFirstName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-4 py-6">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My Account", href: "/my-account" }, { label: title }]} />
          <h1 className="mb-6 mt-2 text-xl font-semibold text-text-primary md:text-2xl">
            {title}
            {customerFirstName && <span className="ml-2 text-base font-normal text-text-secondary">— hi, {customerFirstName}</span>}
          </h1>

          <div className="flex flex-col gap-8 lg:flex-row">
            <aside className="w-full shrink-0 lg:w-56">
              <nav className="rounded-md border border-border p-2">
                <ul className="space-y-0.5 text-sm">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`block rounded px-3 py-2 font-medium ${
                          pathname === link.href ? "bg-surface-soft text-accent-ink" : "text-text-secondary hover:bg-surface-grey"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {COMING_SOON.map((label) => (
                    <li key={label}>
                      <span className="block cursor-not-allowed rounded px-3 py-2 text-text-muted" title="Coming soon">
                        {label}
                      </span>
                    </li>
                  ))}
                  <li className="mt-1 border-t border-border pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded px-3 py-2 text-left font-medium text-text-secondary hover:bg-surface-grey"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </aside>

            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
