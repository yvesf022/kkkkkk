"use client";

import { useEffect } from "react";
import FloatingCartButton from "@/components/store/FloatingCartButton";
import TrustBadges from "@/components/store/TrustBadges";
import { useCart } from "@/lib/cart";

/**
 * Inner component that initializes the cart from the server on mount.
 * Kept separate so useCart() always has a valid call site inside the tree.
 */
function CartInitializer() {
  const fetchCart = useCart((s) => s.fetchCart);
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);
  return null;
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Boot the cart from the API once on layout mount */}
      <CartInitializer />

      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <TrustBadges />
      <FloatingCartButton />
    </div>
  );
}