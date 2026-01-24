"use client";

import { createContext, useContext, useState, ReactNode } from "react";

/* =======================
   Types
======================= */

export type CartItem = {
  _id?: string;
  id?: string;
  title: string;
  price: number;
  quantity: number;
  img?: string;     // legacy / existing usage
  image?: string;   // used by cart/page.tsx
};

type CartContextType = {
  cart: CartItem[];        // alias expected by cart/page.tsx
  items: CartItem[];       // kept for backward compatibility
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
};

/* =======================
   Context
======================= */

const CartContext = createContext<CartContextType | null>(null);

/* =======================
   Provider
======================= */

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => (i._id || i.id) === (item._id || item.id)
      );

      if (existing) {
        return prev.map((i) =>
          (i._id || i.id) === (item._id || item.id)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setItems((prev) =>
      prev.filter((i) => (i._id || i.id) !== id)
    );
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        (i._id || i.id) === id ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart: items,        // ✅ required by cart/page.tsx
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* =======================
   Hook
======================= */

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
