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
      {/* ORDER REFERENCE */}
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
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            {orderId}
          </div>
        </div>
      )}

      {/* SIMPLE INSTRUCTION */}
      <div
        style={{
          fontSize: 16,
          opacity: 0.8,
        }}
      >
        Please complete your payment to activate your order.
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
          Upload Payment Proof →
        </Link>
      )}
    </div>
  );
}
