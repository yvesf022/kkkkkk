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
  const fetchCartRef = useRef(useCart.getState().fetchCart);
  const hasFetched = useRef(false);

  useEffect(() => {
  const fetchCart = fetchCartRef.current;

  if (!hasFetched.current) {
    hasFetched.current = true;
    fetchCart().catch(() => {});
  }

  const handleFocus = () => {
    fetchCart().catch(() => {});
  };

  window.addEventListener("focus", handleFocus);
  return () => window.removeEventListener("focus", handleFocus);
}, []);

  return <>{children}</>;
}
