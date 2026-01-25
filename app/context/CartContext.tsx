"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";

/* =======================
   Types
======================= */

export type CartItem = {
  id: string;            // 🔒 REQUIRED internally
  title: string;
  price: number;
  quantity: number;
  img?: string;
  image?: string;
};

type AddInput = {
  id?: string;
  _id?: string;
  title: string;
  price: number;
  quantity?: number;
  img?: string;
  image?: string;
};

type CartContextType = {
  cart: CartItem[];      // expected by cart/page.tsx
  items: CartItem[];     // backward compatibility
  addToCart: (item: AddInput) => void;
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

  const addToCart = (input: AddInput) => {
    const id = input.id ?? input._id;

    if (!id) {
      console.error("❌ addToCart called without id", input);
      return;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);

      if (existing) {
        return prev.map((i) =>
          i.id === id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [
        ...prev,
        {
          id,
          title: input.title,
          price: input.price,
          quantity: input.quantity ?? 1,
          img: input.img,
          image: input.image,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        cart: items,
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
