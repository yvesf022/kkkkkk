"use client";

import { useSearchParams } from "next/navigation";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  if (!orderId) return null;

  return (
    <div
      style={{
        marginTop: 30,
        padding: 24,
        borderRadius: 16,
        background: "#f8fafc",
        textAlign: "center",
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
  );
}
