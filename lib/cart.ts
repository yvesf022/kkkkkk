"use client";

import { create } from "zustand";
import { ordersApi } from "./api";
import type { Product } from "./types";

/**
 * BACKEND CONTRACT (DO NOT CHANGE):
 *
 * - Cart is FRONTEND-ONLY
 * - Backend does NOT validate item structure
 * - Backend trusts:
 *     - items (any)
 *     - total_amount (number)
 * - Order is created via POST /api/orders
 */

export type CartItem = {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;

  subtotal: () => number;
  totalItems: () => number;

  createOrder: () => Promise<{
    order_id: string;
    order_status: string;
  }>;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],

  /* =========================
     CART MUTATIONS
  ========================== */

  addItem: (product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.product_id === product.id,
      );

      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            product_id: product.id,
            title: product.title,
            price: product.price,
            quantity,
          },
        ],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => i.product_id !== productId,
      ),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity }
          : i,
      ),
    }));
  },

  clear: () => {
    set({ items: [] });
  },

  /* =========================
     DERIVED TOTALS
  ========================== */

  subtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  },

  totalItems: () => {
    return get().items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
  },

  /* =========================
     ORDER CREATION
  ========================== */

  createOrder: async () => {
    const items = get().items;

    if (items.length === 0) {
      throw new Error("Cart is empty");
    }

    const total_amount = get().subtotal();

    /**
     * IMPORTANT:
     * - Backend does NOT validate items
     * - Backend trusts total_amount
     * - Items are stored as-is
     */
    const order = await ordersApi.create({
      items,
      total_amount,
    });

    // Clear cart ONLY after successful order creation
    get().clear();

    return order;
  },
}));
