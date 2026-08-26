"use client";

import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CouponProvider } from "@/context/CouponContext";
import { SavedForLaterProvider } from "@/context/SavedForLaterContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <SavedForLaterProvider>
        <WishlistProvider>
          <CouponProvider>{children}</CouponProvider>
        </WishlistProvider>
      </SavedForLaterProvider>
    </CartProvider>
  );
}
