"use client";

import type { PaymentStatus, ShippingStatus } from "@/lib/types";

type Props = {
  paymentStatus: PaymentStatus | null;
  shippingStatus: ShippingStatus;
  trackingNumber?: string | null;
};

/**
 * ORDER TIMELINE — AUTHORITATIVE
 *
 * BACKEND CONTRACT:
 * - PaymentStatus: "pending" | "paid" | "rejected" | null
 * - ShippingStatus:
 *   "created" | "pending" | "processing" | "shipped" | "delivered" | "returned"
 *
 * FRONTEND RULE:
 * - NEVER invent states
 * - Timeline is a visual interpretation ONLY
 */

const STEPS = [
  { key: "order_created", label: "Order Placed" },
  { key: "payment_pending", label: "Payment Under Review" },
  { key: "payment_paid", label: "Payment Approved" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export default function OrderTimeline({
  paymentStatus,
  shippingStatus,
  trackingNumber,
}: Props) {
  function isStepActive(step: string) {
    switch (step) {
      case "order_created":
        return true;

      case "payment_pending":
        return paymentStatus === "pending" || paymentStatus === "paid";

      case "payment_paid":
        return paymentStatus === "paid";

      case "shipped":
        return (
          shippingStatus === "shipped" ||
          shippingStatus === "delivered"
        );

      case "delivered":
        return shippingStatus === "delivered";

      default:
        return false;
    }
  }

  return (
    <section className="card" style={{ marginTop: 20 }}>
      <h3 style={{ fontWeight: 900 }}>Order Status</h3>

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 16,
        }}
      >
        {STEPS.map((step) => {
          const active = isStepActive(step.key);

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: active ? 1 : 0.4,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: active ? "#22c55e" : "#cbd5e1",
                }}
              />
              <div style={{ fontWeight: 700 }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {trackingNumber && (
        <div
          style={{
            marginTop: 16,
            fontWeight: 700,
          }}
        >
          Tracking Number:{" "}
          <span style={{ fontWeight: 900 }}>
            {trackingNumber}
          </span>
        </div>
      )}
    </section>
  );
}
