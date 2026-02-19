"use client";

/**
 * CartContext — Enterprise Edition
 *
 * Wraps the Zustand cart store and adds:
 * - Server-side sync on mount (pulls real cart from API when logged in)
 * - Guest → auth merge on login
 * - Exposes cartApi for direct server operations
 *
 * Components importing from "@/app/context/CartContext" get useCart.
 * Components needing server sync should use CartSyncProvider.
 */

export { useCart } from "@/lib/cart";
export { default as CartSyncProvider } from "@/components/providers/CartSyncProvider";