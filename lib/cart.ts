"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ordersApi, cartApi } from "./api";
import type { Cart, CartItem } from "./types";

/**
 * ENTERPRISE CART - Hybrid Local + Server Sync
 * 
 * Strategy:
 * - Guest users: Pure local state (fast, no API calls)
 * - Logged in users: Sync with backend cart API
 * - Auto-merge on login
 */

/* =========================
   LOCAL CART PRODUCT TYPE
========================== */

export type CartProduct = {
  id: string;
  title: string;
  price: number;
  main_image?: string;
  variant_id?: string;
};

/* =========================
   LOCAL CART ITEM
========================== */

export type LocalCartItem = {
  product_id: string;
  variant_id?: string;
  title: string;
  price: number;
  quantity: number;
  main_image?: string;
};

/* =========================
   CART STATE
========================== */

type CartState = {
  // Local state (always available)
  items: LocalCartItem[];
  
  // Server sync state
  serverCart: Cart | null;
  isSyncing: boolean;
  isLoggedIn: boolean;

  // Cart mutations (works for both guest and logged-in)
  addItem: (product: CartProduct, quantity?: number) => Promise<void>;
  removeItem: (productId: string, variantId?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  clear: () => Promise<void>;

  // Sync operations
  syncWithServer: () => Promise<void>;
  mergeOnLogin: () => Promise<void>;
  setLoggedIn: (loggedIn: boolean) => void;

  // Derived totals
  subtotal: () => number;
  totalItems: () => number;

  // Order creation
  createOrder: (shippingAddress?: any) => Promise<{
    order_id: string;
    order_status: string;
  }>;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      serverCart: null,
      isSyncing: false,
      isLoggedIn: false,

      /* =========================
         SET LOGIN STATE
      ========================== */
      setLoggedIn: (loggedIn: boolean) => {
        set({ isLoggedIn: loggedIn });
        if (loggedIn) {
          get().mergeOnLogin();
        }
      },

      /* =========================
         ADD ITEM
      ========================== */
      addItem: async (product: CartProduct, quantity = 1) => {
        const state = get();
        
        // Update local state immediately (optimistic)
        const existing = state.items.find(
          (i) => i.product_id === product.id && 
                 (i.variant_id || null) === (product.variant_id || null)
        );

        if (existing) {
          set({
            items: state.items.map((i) =>
              i.product_id === product.id && 
              (i.variant_id || null) === (product.variant_id || null)
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...state.items,
              {
                product_id: product.id,
                variant_id: product.variant_id,
                title: product.title,
                price: product.price,
                quantity,
                main_image: product.main_image,
              },
            ],
          });
        }

        // Sync with server if logged in
        if (state.isLoggedIn) {
          try {
            await cartApi.addItem({
              product_id: product.id,
              variant_id: product.variant_id,
              quantity,
            });
            await get().syncWithServer();
          } catch (error) {
            console.error("Failed to sync cart with server:", error);
            // Keep local state, will retry on next sync
          }
        }
      },

      /* =========================
         REMOVE ITEM
      ========================== */
      removeItem: async (productId: string, variantId?: string) => {
        const state = get();

        // Update local state
        set({
          items: state.items.filter(
            (i) =>
              !(i.product_id === productId && 
                (i.variant_id || null) === (variantId || null))
          ),
        });

        // Sync with server if logged in
        if (state.isLoggedIn && state.serverCart) {
          try {
            const serverItem = state.serverCart.items.find(
              (i) => i.product_id === productId && 
                     (i.variant_id || null) === (variantId || null)
            );
            if (serverItem) {
              await cartApi.removeItem(serverItem.id);
              await get().syncWithServer();
            }
          } catch (error) {
            console.error("Failed to remove item from server:", error);
          }
        }
      },

      /* =========================
         UPDATE QUANTITY
      ========================== */
      updateQuantity: async (productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
          return get().removeItem(productId, variantId);
        }

        const state = get();

        // Update local state
        set({
          items: state.items.map((i) =>
            i.product_id === productId && 
            (i.variant_id || null) === (variantId || null)
              ? { ...i, quantity }
              : i
          ),
        });

        // Sync with server if logged in
        if (state.isLoggedIn && state.serverCart) {
          try {
            const serverItem = state.serverCart.items.find(
              (i) => i.product_id === productId && 
                     (i.variant_id || null) === (variantId || null)
            );
            if (serverItem) {
              await cartApi.updateItem(serverItem.id, { quantity });
              await get().syncWithServer();
            }
          } catch (error) {
            console.error("Failed to update quantity on server:", error);
          }
        }
      },

      /* =========================
         CLEAR CART
      ========================== */
      clear: async () => {
        const state = get();
        
        set({ items: [] });

        if (state.isLoggedIn) {
          try {
            await cartApi.clear();
            set({ serverCart: null });
          } catch (error) {
            console.error("Failed to clear server cart:", error);
          }
        }
      },

      /* =========================
         SYNC WITH SERVER
      ========================== */
      syncWithServer: async () => {
        const state = get();
        if (!state.isLoggedIn || state.isSyncing) return;

        set({ isSyncing: true });

        try {
          const serverCart = await cartApi.get() as Cart;
          
          // Update local items from server
          const localItems: LocalCartItem[] = serverCart.items.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id || undefined,
            title: item.product?.title || "Product",
            price: item.price,
            quantity: item.quantity,
            main_image: item.product?.main_image || undefined,
          }));

          set({ 
            serverCart, 
            items: localItems 
          });
        } catch (error) {
          console.error("Failed to sync with server:", error);
        } finally {
          set({ isSyncing: false });
        }
      },

      /* =========================
         MERGE ON LOGIN
      ========================== */
      mergeOnLogin: async () => {
        const state = get();
        if (!state.isLoggedIn || state.items.length === 0) {
          // Just sync if no local items
          return get().syncWithServer();
        }

        set({ isSyncing: true });

        try {
          // Send local items to server for merging
          await cartApi.merge(state.items);
          
          // Fetch merged cart
          await get().syncWithServer();
        } catch (error) {
          console.error("Failed to merge cart:", error);
          // If merge fails, keep local items
        } finally {
          set({ isSyncing: false });
        }
      },

      /* =========================
         DERIVED TOTALS
      ========================== */
      subtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      totalItems: () => {
        return get().items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
      },

      /* =========================
         ORDER CREATION
      ========================== */
      createOrder: async (shippingAddress?: any) => {
        const items = get().items;

        if (items.length === 0) {
          throw new Error("Cart is empty");
        }

        const total_amount = get().subtotal();

        const order = (await ordersApi.create({
          total_amount,
          shipping_address: shippingAddress,
        })) as {
          order_id: string;
          order_status: string;
        };

        // Clear cart after successful order
        await get().clear();

        return order;
      },
    }),
    {
      name: "karabo-cart",
      partialize: (state) => ({
        items: state.items,
        // Don't persist server state or sync flags
      }),
    }
  )
);
