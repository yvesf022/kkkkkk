"use client";

import { create } from "zustand";
import { ordersApi } from "./api";

/**
 * BACKEND CONTRACT (DO NOT CHANGE):
 *
 * - Cart is FRONTEND-ONLY
 * - Backend does NOT accept cart items
 * - Backend trusts:
 *     - total_amount (number)
 * - Order is created via POST /api/orders
 */

/* =========================
   SAFE CART PRODUCT TYPE
========================== */

export type CartProduct = {
  id: string;
  title: string;
  price: number;
  main_image?: string;   // ✅ added
};

/* =========================
   CART ITEM (STATE)
========================== */

export type CartItem = {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  main_image?: string;   // ✅ added
};

/* =========================
   CART STATE
========================== */

type CartState = {
  items: CartItem[];

  addItem: (product: CartProduct, quantity?: number) => void;
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

  addItem: (product: CartProduct, quantity = 1) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.product_id === product.id
      );

      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
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
            main_image: product.main_image, // ✅ stored
          },
        ],
      };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter(
        (i) => i.product_id !== productId
      ),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity }
          : i
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

  createOrder: async () => {
    const items = get().items;

    if (items.length === 0) {
      throw new Error("Cart is empty");
    }

    const total_amount = get().subtotal();

    const order = (await ordersApi.create({
      total_amount,
    })) as {
      order_id: string;
      order_status: string;
    };

    get().clear();

    return order;
  },
}));
