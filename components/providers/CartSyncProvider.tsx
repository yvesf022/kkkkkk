"use client";

/**
 * CartSyncProvider
 * 
 * - Fetches the server cart on mount (when user is logged in)
 * - If the API returns 401 (guest), keeps localStorage cart as-is
 * - After login events, the guest cart is merged (handled in login/register pages)
 * - Re-fetches cart when window regains focus (handles returning from payment screen)
 */

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";

export default function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const fetchCart = useCart((s) => s.fetchCart);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Initial fetch on mount
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchCart().catch(() => {}); // Silently ignore 401 for guests
    }

    // Re-fetch when tab regains focus — covers: payment app switch, back navigation
    const handleFocus = () => {
      fetchCart().catch(() => {});
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchCart]);

  return <>{children}</>;
}