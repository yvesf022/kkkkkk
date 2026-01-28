"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  image?: string;
  quantity: number;
  stock?: number;
};

type CartContextType = {
  items: CartItem[];

  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;

  total: number;

  /* ✅ AMAZON-LEVEL SAFE ADDITIONS */
  itemCount: number;              // total quantity (badge-ready)
  hasStockIssues: boolean;         // UX warning helper
  formattedTotal: string;          // UI-ready currency string
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addToCart(input: Omit<CartItem, "quantity">) {
    const id = input.id;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);

      if (!existing) {
        return [...prev, { ...input, quantity: 1 }];
      }

      const nextQty = existing.quantity + 1;
      const maxQty =
        typeof existing.stock === "number"
          ? Math.min(existing.stock, nextQty)
          : nextQty;

      return prev.map((i) =>
        i.id === id ? { ...i, quantity: maxQty } : i
      );
    });
  }

  function removeFromCart(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function increaseQty(id: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;

        const nextQty = i.quantity + 1;
        const maxQty =
          typeof i.stock === "number"
            ? Math.min(i.stock, nextQty)
            : nextQty;

        return { ...i, quantity: maxQty };
      })
    );
  }

  function decreaseQty(id: string) {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.id !== id) return i;

        if (i.quantity <= 1) return [];
        return [{ ...i, quantity: i.quantity - 1 }];
      })
    );
  }

  function clearCart() {
    setItems([]);
  }

  /* ===========================
     DERIVED VALUES (SAFE)
  =========================== */

  const total = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      ),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const hasStockIssues = useMemo(
    () =>
      items.some(
        (i) =>
          typeof i.stock === "number" &&
          i.quantity > i.stock
      ),
    [items]
  );

  const formattedTotal = useMemo(
    () => `M${total.toLocaleString()}`,
    [total]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
        total,

        /* new helpers */
        itemCount,
        hasStockIssues,
        formattedTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }
  return ctx;
}
