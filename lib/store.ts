import { create } from "zustand";
import { products } from "@/lib/products";

export type CartLine = { id: string; qty: number };

type StoreState = {
  cart: CartLine[];
  wishlist: string[];

  addToCart: (id: string, qty?: number) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;

  toggleWishlist: (id: string) => void;

  cartCount: () => number;
  cartTotal: () => number;

  // ✅ Lesotho currency helper
  formatMoney: (v: number) => string;
};

export const useStore = create<StoreState>((set, get) => ({
  cart: [],
  wishlist: [],

  addToCart: (id, qty = 1) =>
    set((s) => {
      const exists = s.cart.find((x) => x.id === id);
      if (exists) {
        return {
          cart: s.cart.map((x) =>
            x.id === id ? { ...x, qty: x.qty + qty } : x
          ),
        };
      }
      return { cart: [...s.cart, { id, qty }] };
    }),

  removeFromCart: (id) =>
    set((s) => ({ cart: s.cart.filter((x) => x.id !== id) })),

  setQty: (id, qty) =>
    set((s) => ({
      cart: s.cart.map((x) => (x.id === id ? { ...x, qty } : x)),
    })),

  clearCart: () => set({ cart: [] }),

  toggleWishlist: (id) =>
    set((s) => ({
      wishlist: s.wishlist.includes(id)
        ? s.wishlist.filter((x) => x !== id)
        : [...s.wishlist, id],
    })),

  cartCount: () => get().cart.reduce((sum, x) => sum + x.qty, 0),

  cartTotal: () => {
    const { cart } = get();
    return cart.reduce((sum, x) => {
      const p = products.find((p) => p.id === x.id);
      return sum + (p ? p.price * x.qty : 0);
    }, 0);
  },

  // ✅ FORMAT: "M 12,500"
  formatMoney: (v) => `M ${Math.round(v).toLocaleString("en-ZA")}`,
}));
