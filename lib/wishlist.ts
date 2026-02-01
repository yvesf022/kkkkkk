"use client";

import { create } from "zustand";

/**
 * BACKEND CONTRACT (DO NOT CHANGE):
 *
 * - Backend has NO wishlist support
 * - Wishlist is FRONTEND-ONLY
 * - No API calls
 * - No persistence beyond browser session (unless you later add it)
 */

export type WishlistItem = {
  product_id: string;
  title: string;
  price: number;
  image?: string | null;
};

type WishlistState = {
  items: WishlistItem[];

  add: (item: WishlistItem) => void;
  remove: (productId: string) => void;
  toggle: (item: WishlistItem) => void;
  clear: () => void;
  has: (productId: string) => boolean;
};

export const useWishlist = create<WishlistState>((set, get) => ({
  items: [],

  /* =========================
     MUTATIONS
  ========================== */

  add: (item) => {
    const exists = get().items.some(
      (i) => i.product_id === item.product_id,
    );

    if (exists) return;

    set((state) => ({
      items: [...state.items, item],
    }));
  },

  remove: (productId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => i.product_id !== productId,
      ),
    }));
  },

  toggle: (item) => {
    const exists = get().items.some(
      (i) => i.product_id === item.product_id,
    );

    if (exists) {
      get().remove(item.product_id);
    } else {
      get().add(item);
    }
  },

  clear: () => {
    set({ items: [] });
  },

  /* =========================
     HELPERS
  ========================== */

  has: (productId) => {
    return get().items.some(
      (i) => i.product_id === productId,
    );
  },
}));
