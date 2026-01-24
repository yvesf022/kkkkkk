"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div
      className="glass neon-text"
      style={{ padding: "2rem", marginTop: "2rem" }}
    >
      <h1>Order Placed Successfully 🎉</h1>

      <p>
        Thank you for your order. We have received your request and will review
        your payment shortly.
      </p>

      <p>
        <strong>Order Reference:</strong>{" "}
        {orderId ? orderId : "Check this in your account"}
      </p>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
        {/* ✅ CONSISTENT ROUTE */}
        <Link href="/account" className="btn">
          View My Orders
        </Link>

        <Link href="/" className="btn pill">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
