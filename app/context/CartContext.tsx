"use client";

/**
 * CartContext - Compatibility wrapper
 * Re-exports from lib/cart for backward compatibility
 */

import { useCart as useCartZustand } from "@/lib/cart";

export function useCart() {
  const cart = useCartZustand();
  
  return {
    items: cart.items,
    addItem: (product: any, quantity: number = 1) => {
      cart.addItem(product, quantity);
    },
    removeFromCart: (productId: string) => {
      cart.removeItem(productId);
    },
    updateQuantity: (productId: string, quantity: number) => {
      cart.updateQuantity(productId, quantity);
    },
    clearCart: () => {
      cart.clear();
    },
    subtotal: cart.subtotal,
    totalItems: cart.totalItems,
  };
}