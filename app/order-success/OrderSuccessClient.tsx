"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div
      style={{
        marginTop: 30,
        display: "grid",
        gap: 30,
        textAlign: "center",
      }}
    >
      {/* ORDER NUMBER */}
      {orderId && (
        <div
          style={{
            padding: 24,
            borderRadius: 16,
            background: "#f8fafc",
            fontSize: 16,
          }}
        >
          <strong>Order Number:</strong>
          <div
            style={{
              marginTop: 8,
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            {orderId}
          </div>
        </div>
      )}

      {/* SIMPLE MESSAGE */}
      <div
        style={{
          fontSize: 16,
          opacity: 0.8,
        }}
      >
        Your order has been created successfully.
        <br />
        Please proceed to complete payment.
      </div>

      {/* SINGLE ACTION */}
      {orderId && (
        <Link
          href={`/account/orders/${orderId}`}
          className="btn btnPrimary"
          style={{
            padding: "16px 40px",
            fontSize: 18,
            justifySelf: "center",
          }}
        >
          Proceed to Payment →
        </Link>
      )}
    </div>
  );
}
