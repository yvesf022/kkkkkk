"use client";

import { createContext, useContext, useState } from "react";

export type CartItem = {
  _id?: string;
  id?: string;
  title: string;
  price: number;
  quantity: number;
  img?: string;
};

type CartContextType = {
  cart: CartItem[];              // ✅ alias used by cart/page.tsx
  items: CartItem[];             // (kept for compatibility)
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
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

  const clearCart = () => setItems([]);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart: items,          // ✅ this fixes Netlify error
        items,
        addToCart,
        removeFromCart,
        updateQuantity,       // ✅ added
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
