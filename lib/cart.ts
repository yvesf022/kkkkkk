/**
 * @/lib/cart — Zustand cart store that SYNCS WITH THE API.
 * Drop-in replacement for the old local-only store.
 * Keeps the same useCart(selector) interface so nothing else breaks.
 *
 * ✅ FIXED: Cart is now persisted to localStorage so it survives:
 * - Navigating back from checkout
 * - Switching to another app to make payment
 * - Accidental tab/app close
 * - Page refresh
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { cartApi } from "@/lib/api";
import type { Cart, CartItem, Product, ProductVariant } from "@/lib/types";

interface CartStore {
  /* ── state ──────────────────────────────────── */
  cart: Cart | null;
  loading: boolean;
  error: string | null;

  /* ── derived (computed on access) ──────────── */
  itemCount: number;
  subtotal: number;

  /* ── actions ────────────────────────────────── */
  /** Fetch cart from server — call once on mount (layout) */
  fetchCart: () => Promise<void>;

  /**
   * Add item to cart — calls API, updates local state.
   * Kept compatible with old signature addItem(product, qty, variantId?)
   */
  addItem: (
    productOrId: Product | string,
    qty: number,
    variantId?: string
  ) => Promise<void>;

  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;

  /** Merge guest cart after login */
  mergeGuestCart: () => Promise<void>;

  /** Internal: set cart directly (used after API responses) */
  _setCart: (cart: Cart) => void;
}

function computeDerived(cart: Cart | null) {
  const items = cart?.items ?? [];
  return {
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  };
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: null,
      loading: false,
      error: null,
      itemCount: 0,
      subtotal: 0,

      _setCart(cart: Cart) {
        set({ cart, ...computeDerived(cart) });
      },

      async fetchCart() {
        set({ loading: true, error: null });
        try {
          const cart = (await cartApi.get()) as Cart;
          set({ cart, loading: false, ...computeDerived(cart) });
        } catch (e: any) {
          set({ loading: false, error: e?.message ?? "Could not load cart" });
        }
      },

      async addItem(productOrId, qty, variantId) {
        const productId =
          typeof productOrId === "string" ? productOrId : productOrId.id;

        set({ loading: true, error: null });
        try {
          const cart = (await cartApi.addItem({
            product_id: productId,
            variant_id: variantId,
            quantity: qty,
          })) as Cart;
          set({ cart, loading: false, ...computeDerived(cart) });
        } catch (e: any) {
          set({ loading: false, error: e?.message ?? "Could not add item" });
          throw e;
        }
      },

      async updateItem(itemId, quantity) {
        const prev = get().cart;
        if (prev) {
          const optimistic: Cart = {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
          set({ cart: optimistic, ...computeDerived(optimistic) });
        }

        try {
          const cart = (await cartApi.updateItem(itemId, { quantity })) as Cart;
          set({ cart, ...computeDerived(cart) });
        } catch (e: any) {
          if (prev) set({ cart: prev, ...computeDerived(prev) });
          set({ error: e?.message ?? "Could not update item" });
          throw e;
        }
      },

      async removeItem(itemId) {
        const prev = get().cart;
        if (prev) {
          const optimistic: Cart = {
            ...prev,
            items: prev.items.filter((i) => i.id !== itemId),
          };
          set({ cart: optimistic, ...computeDerived(optimistic) });
        }

        try {
          await cartApi.removeItem(itemId);
          const cart = (await cartApi.get()) as Cart;
          set({ cart, ...computeDerived(cart) });
        } catch (e: any) {
          if (prev) set({ cart: prev, ...computeDerived(prev) });
          set({ error: e?.message ?? "Could not remove item" });
          throw e;
        }
      },

      async clearCart() {
        const prev = get().cart;
        if (prev) {
          const empty: Cart = { ...prev, items: [], subtotal: 0 };
          set({ cart: empty, itemCount: 0, subtotal: 0 });
        }
        try {
          await cartApi.clear();
        } catch (e: any) {
          if (prev) set({ cart: prev, ...computeDerived(prev) });
          set({ error: e?.message ?? "Could not clear cart" });
          throw e;
        }
      },

      async mergeGuestCart() {
        const items = get().cart?.items ?? [];
        if (items.length === 0) return;
        try {
          await cartApi.merge(
            items.map((i) => ({
              product_id: i.product_id,
              variant_id: i.variant_id ?? undefined,
              quantity: i.quantity,
            }))
          );
          await get().fetchCart();
        } catch {
          // silent — guest cart merge is best-effort
        }
      },
    }),
    {
      name: "karabo-cart",                          // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist cart data — not loading/error states
      partialize: (state) => ({
        cart: state.cart,
        itemCount: state.itemCount,
        subtotal: state.subtotal,
      }),
    }
  )
);