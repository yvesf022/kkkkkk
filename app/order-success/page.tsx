"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const [orderRef, setOrderRef] = useState<string | null>(null);

  useEffect(() => {
    // Backend will redirect here with ?orderRef=KB-2026-000123
    const ref = searchParams.get("orderRef");
    if (ref) setOrderRef(ref);
  }, [searchParams]);

  return (
    <div
      className="glass neon-border"
      style={{
        padding: 20,
        display: "grid",
        gap: 14,
        maxWidth: 560,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      {/* SUCCESS ICON / TITLE */}
      <div
        className="neon-text"
        style={{ fontSize: 30, fontWeight: 1000 }}
      >
        ✅ Order Confirmed
      </div>

      {/* MESSAGE */}
      <div
        style={{
          color: "var(--muted)",
          lineHeight: 1.6,
          fontWeight: 900,
        }}
      >
        Thank you for shopping with{" "}
        <b>Karabo’s Online Store</b>.
        <br />
        Your order has been placed successfully.
      </div>

      {/* ORDER ID */}
      <div
        className="pill"
        style={{
          justifyContent: "center",
          fontWeight: 1000,
          letterSpacing: 0.4,
        }}
      >
        Order ID:{" "}
        <span className="neon-text">
          {orderRef ?? "Loading…"}
        </span>
      </div>

      {/* NEXT STEPS */}
      <div
        style={{
          fontSize: 14,
          color: "var(--muted2)",
          lineHeight: 1.6,
        }}
      >
        📧 You can track payment and shipping status in your account.  
        <br />
        🚚 Your order will be dispatched after payment confirmation.
      </div>

      <div className="hr" />

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link href="/store" className="btn btnPrimary">
          Continue Shopping →
        </Link>

        <Link href="/account" className="btn">
          View My Orders
        </Link>
      </div>

      {/* TRUST FOOTER */}
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: "var(--muted2)",
        }}
      >
        Need help? Contact our support anytime.
      </div>
    </div>
  );
}
