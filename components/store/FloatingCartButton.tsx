"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import CartDrawer from "./CartDrawer";

export default function FloatingCartButton() {
  const itemCount = useCart((s) => s.itemCount);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="floating-cart"
        onClick={() => setOpen(true)}
      >
        🛒
        {itemCount > 0 && (
          <span className="cart-count">
            {itemCount}
          </span>
        )}
      </div>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}