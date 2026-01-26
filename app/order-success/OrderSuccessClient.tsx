"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        maxWidth: 720,
        margin: "48px auto 0",
      }}
    >
      <section
        style={{
          borderRadius: 26,
          padding: "32px 36px",
          background: `
            radial-gradient(
              420px 220px at 10% 0%,
              rgba(96,165,250,0.28),
              transparent 60%
            ),
            radial-gradient(
              360px 200px at 90% 10%,
              rgba(244,114,182,0.22),
              transparent 60%
            ),
            linear-gradient(
              135deg,
              #f8fbff,
              #eef6ff,
              #fff1f6
            )
          `,
          boxShadow: "0 26px 70px rgba(15,23,42,0.18)",
        }}
      >
        {/* ICON */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background:
              "linear-gradient(135deg,#60a5fa,#93c5fd,#f472b6)",
            boxShadow:
              "0 12px 34px rgba(96,165,250,0.45)",
            fontSize: 28,
          }}
        >
          ✓
        </div>

        <h1
          style={{
            marginTop: 18,
            fontSize: 28,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Order Placed Successfully
        </h1>

        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(15,23,42,0.65)",
            maxWidth: 520,
          }}
        >
          Thank you for your order. Your payment is currently under review.
          You’ll be notified as soon as it’s confirmed by our team.
        </p>

        {/* ORDER ID */}
        <div
          style={{
            marginTop: 16,
            padding: "14px 18px",
            borderRadius: 18,
            background: "rgba(255,255,255,0.75)",
            boxShadow:
              "inset 0 0 0 1px rgba(15,23,42,0.06)",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          <span style={{ opacity: 0.7 }}>Order Reference:</span>{" "}
          {orderId ? orderId : "Available in your account"}
        </div>

        {/* ACTIONS */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <Link href="/account" className="btn btnTech">
            View My Orders →
          </Link>

          <Link href="/" className="btn btnGhost">
            Continue Shopping
          </Link>
        </div>
      </section>
    </div>
  );
}
