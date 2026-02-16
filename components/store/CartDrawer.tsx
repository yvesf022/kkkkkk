"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const cart = useCart();
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /* Lock scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  /* Swipe down to close (mobile) */
  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const delta = e.touches[0].clientY - startY;
      if (delta > 120) onClose();
    };

    const el = drawerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart);
    el.addEventListener("touchmove", handleTouchMove);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [onClose]);

  return (
    <>
      <div
        className={`cart-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        className={`cart-drawer ${open ? "open" : ""}`}
      >
        {/* HEADER */}
        <div className="cart-drawer-header">
          <h3>Your Cart</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="cart-drawer-body">
          {cart.items.length === 0 && (
            <div className="cart-empty">
              Your cart is empty
            </div>
          )}

          {cart.items.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-top">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="cart-thumb"
                  />
                )}

                <div className="cart-item-title">
                  {item.title}
                </div>
              </div>

              <div className="cart-item-controls">
                {/* Quantity Stepper */}
                <div className="qty-stepper">
                  <button
                    onClick={() =>
                      cart.updateQuantity(
                        item.id,
                        item.quantity - 1
                      )
                    }
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    onClick={() =>
                      cart.updateQuantity(
                        item.id,
                        item.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <div className="cart-item-price">
                  {formatCurrency(
                    item.price * item.quantity
                  )}
                </div>
              </div>

              <button
                className="cart-remove"
                onClick={() =>
                  cart.removeItem(item.id)
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        {cart.items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <strong>
                {formatCurrency(subtotal)}
              </strong>
            </div>

            <button
              className="btn btnPrimary"
              onClick={() => {
                onClose();
                router.push("/store/checkout");
              }}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
