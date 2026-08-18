"use client";

import Link from "next/link";
import { AccountLayout } from "@/components/account/AccountLayout";
import { CoinIcon } from "@/components/icons/Icons";
import { useWishlist } from "@/context/WishlistContext";

const MOCK_BUDDY_COINS_BALANCE = 128;

export default function MyAccountPage() {
  const { ids } = useWishlist();

  return (
    <AccountLayout title="Overview">
      <div className="rounded-md border border-dashed border-discount bg-surface-soft px-4 py-3 text-sm text-text-secondary">
        This dashboard is a preview — sign-in and real order/points history sync in once auth and the
        Neon-backed rewards API are connected (see the integration map, §12 and §8).
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <CoinIcon className="h-4 w-4 text-accent" /> Buddy Coins
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{MOCK_BUDDY_COINS_BALANCE}</p>
          <Link href="/account/buddy-coins" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            View history →
          </Link>
        </div>

        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-bold text-text-primary">Wishlist</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{ids.length}</p>
          <Link href="/wishlist" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            View wishlist →
          </Link>
        </div>

        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-bold text-text-primary">Referrals</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">0</p>
          <Link href="/account/referrals" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            Invite friends →
          </Link>
        </div>
      </div>
    </AccountLayout>
  );
}
