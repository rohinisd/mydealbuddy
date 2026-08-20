"use client";

import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CouponProvider } from "@/context/CouponContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <CouponProvider>{children}</CouponProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
