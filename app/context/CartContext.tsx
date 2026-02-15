"use client";

/**
 * CartContext - Compatibility Re-export
 *
 * This file exists only for backward compatibility.
 * The real cart logic lives in: /lib/cart (Zustand store)
 *
 * Any component importing from:
 * "@/app/context/CartContext"
 *
 * Will receive the Zustand useCart hook.
 */

export { useCart } from "@/lib/cart";
