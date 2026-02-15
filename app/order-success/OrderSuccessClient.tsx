"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  if (!orderId) return null;

  return (
    <div style={{ marginTop: 30 }}>
      {/* ORDER ID */}
      <div
        style={{
          marginBottom: 30,
          padding: 20,
          borderRadius: 16,
          background: "#f4f9ff",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        Order ID: {orderId}
      </div>

      {/* SINGLE ACTION BUTTON */}
      <Link
        href={`/account/orders/${orderId}`}
        className="btn btnPrimary"
        style={{
          padding: "16px 50px",
          fontSize: 18,
        }}
      >
        Proceed to Payment →
      </Link>
    </div>
  );
}
