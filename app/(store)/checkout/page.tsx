"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { useState } from "react";

import { useCart } from "@/app/context/CartContext";

/** Lesotho currency formatter (Maloti) */
const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

type CreateOrderPayload = {
  items: {
    product_id: string;
    quantity: number;
    price: number;
  }[];
  total_amount: number;
};

async function createOrder(payload: CreateOrderPayload) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("Order creation failed");
  }

  return res.json();
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  const total = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  // 🚫 No cart → no checkout
  if (items.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Checkout
        </h1>
        <p style={{ opacity: 0.6, marginTop: 8 }}>
          Your cart is empty.
        </p>
      </div>
    );
  }

  async function handlePlaceOrder() {
    try {
      setLoading(true);

      const order = await createOrder({
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          price: i.price,
        })),
        total_amount: total,
      });

      clearCart();

      router.push(
        `/order-success?orderId=${order.id}`
      );
    } catch {
      toast.error(
        "Failed to place order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>
        Checkout
      </h1>

      {/* ITEMS */}
      <div style={{ display: "grid", gap: 18 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr auto",
              gap: 16,
              alignItems: "center",
              padding: 16,
              borderRadius: 18,
              background: "#fff",
              boxShadow:
                "0 12px 30px rgba(15,23,42,0.08)",
            }}
          >
            <Image
              src={item.image}
              alt={item.title}
              width={80}
              height={80}
              style={{
                objectFit: "cover",
                borderRadius: 12,
              }}
            />

            <div>
              <div style={{ fontWeight: 800 }}>
                {item.title}
              </div>
              <div style={{ opacity: 0.6 }}>
                {fmtM(item.price)} × {item.quantity}
              </div>
            </div>

            <div style={{ fontWeight: 900 }}>
              {fmtM(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      {/* SUMMARY */}
      <div
        style={{
          padding: 22,
          borderRadius: 24,
          background:
            "linear-gradient(135deg,#ffffff,#f4f9ff)",
          boxShadow:
            "0 18px 50px rgba(15,23,42,0.14)",
          maxWidth: 420,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Order Summary
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span>Total</span>
          <span>{fmtM(total)}</span>
        </div>

        <button
          className="btn btnTech"
          onClick={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? "Placing order..." : "Place Order"}
        </button>

        <p style={{ fontSize: 12, opacity: 0.6 }}>
          Payment will be completed manually after
          placing the order.
        </p>
      </div>
    </div>
  );
}
