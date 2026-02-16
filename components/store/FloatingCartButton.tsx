"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import CartDrawer from "./CartDrawer";

export default function FloatingCartButton() {
  const cart = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="floating-cart"
        onClick={() => setOpen(true)}
      >
        🛒
        {cart.items.length > 0 && (
          <span className="cart-count">
            {cart.items.length}
          </span>
        )}
      </div>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
