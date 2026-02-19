"use client";

/**
 * OrderSuccessClient
 *
 * FIXES:
 * 1. Encoding: arrow "→" and checkmark "✓" were mojibake'd (â†', â"✓)
 *    due to file saved with wrong encoding. Now using HTML entities / Unicode escapes.
 * 2. Cart clearing is handled in PaymentClient on mount — not needed here.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  if (!orderId) return null;

  return (
    <div
      style={{
        marginTop: 30,
        display: "grid",
        gap: 30,
        justifyItems: "center",
      }}
    >
      {/* ORDER REFERENCE CARD */}
      <div
        style={{
          padding: "18px 30px",
          borderRadius: 18,
          background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)",
          border: "1px solid #bae6fd",
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: 0.5,
        }}
      >
        Order Reference:{" "}
        <span style={{ fontWeight: 900 }}>{orderId.slice(0, 8).toUpperCase()}</span>
      </div>

      {/* MAIN CTA */}
      <Link
        href={`/store/payment?order_id=${orderId}`}
        className="btn btnPrimary"
        style={{
          padding: "18px 60px",
          fontSize: 18,
          fontWeight: 900,
          borderRadius: 16,
          boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
          transition: "all 0.2s ease",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        Proceed to Payment &#x2192;
      </Link>
    </div>
  );
}