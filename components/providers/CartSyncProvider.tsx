"use client";

import { useEffect } from "react";
import { cartApi } from "@/lib/api";

/**
 * CartSyncProvider
 * Mount this inside your authenticated layout.
 * It merges any local guest cart items into the server cart.
 */
export default function CartSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function syncCart() {
      try {
        // Fetch server cart to trigger session merge
        await cartApi.get();
      } catch {
        // Silently fail — user may not be logged in
      }
    }
    syncCart();
  }, []);

  return <>{children}</>;
}