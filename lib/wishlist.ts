"use client";

import { create } from "zustand";
import { wishlistApi } from "./api";
import type { WishlistItem as ApiWishlistItem } from "./types";

/**
 * WISHLIST STORE — API-BACKED
 *
 * Backend contract:
 * - GET    /api/wishlist               → list items
 * - POST   /api/wishlist/{product_id}  → add item
 * - DELETE /api/wishlist/{product_id}  → remove item
 * - POST   /api/wishlist/{product_id}/move-to-cart → move to cart
 *
 * Falls back to local-only if user is not logged in (API returns 401).
 */

export type WishlistItem = {
  product_id: string;
  title: string;
  price: number;
  image?: string | null;
};

type WishlistState = {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;

  /** Fetch wishlist from server — call on mount when user is logged in */
  fetch: () => Promise<void>;

  add: (item: WishlistItem) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  toggle: (item: WishlistItem) => Promise<void>;
  moveToCart: (productId: string) => Promise<void>;
  clear: () => void;
  has: (productId: string) => boolean;
};

export const useWishlist = create<WishlistState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = (await wishlistApi.list()) as any;
      const raw: any[] = Array.isArray(data) ? data : data?.items ?? data?.results ?? [];
      const items: WishlistItem[] = raw.map((w: any) => ({
        product_id: w.product_id ?? w.product?.id ?? w.id,
        title:      w.product?.title ?? w.title ?? "",
        price:      w.product?.price ?? w.price ?? 0,
        image:      w.product?.main_image ?? w.product?.image_url ?? w.image ?? null,
      }));
      set({ items, loading: false });
    } catch {
      // 401 = not logged in, silently ignore — wishlist stays local/empty
      set({ loading: false });
    }
  },

  add: async (item: WishlistItem) => {
    // Optimistic update
    if (!get().has(item.product_id)) {
      set((s) => ({ items: [...s.items, item] }));
    }
    try {
      await wishlistApi.add(item.product_id);
    } catch {
      // Rollback on failure
      set((s) => ({ items: s.items.filter((i) => i.product_id !== item.product_id) }));
    }
  },

  remove: async (productId: string) => {
    const prev = get().items;
    // Optimistic update
    set((s) => ({ items: s.items.filter((i) => i.product_id !== productId) }));
    try {
      await wishlistApi.remove(productId);
    } catch {
      // Rollback
      set({ items: prev });
    }
  },

  toggle: async (item: WishlistItem) => {
    if (get().has(item.product_id)) {
      await get().remove(item.product_id);
    } else {
      await get().add(item);
    }
  },

  moveToCart: async (productId: string) => {
    try {
      await wishlistApi.moveToCart(productId);
      set((s) => ({ items: s.items.filter((i) => i.product_id !== productId) }));
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to move to cart" });
      throw e;
    }
  },

  clear: () => set({ items: [], error: null }),

  has: (productId: string) =>
    get().items.some((i) => i.product_id === productId),
}));