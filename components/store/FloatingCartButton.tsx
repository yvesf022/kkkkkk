"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import CartDrawer from "./CartDrawer";

export default function FloatingCartButton() {
  const cart = useCart();
  const [open, setOpen] = useState(false);

  if (!cart.items.length) return null;

  return (
    <>
      <div
        className="floating-cart"
        onClick={() => setOpen(true)}
      >
        🛒
        <span className="cart-count">
          {cart.items.length}
        </span>
      </div>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
