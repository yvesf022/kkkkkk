"use client";

import toast from "react-hot-toast";

/*
  NOTE:
  This page is UI-complete.
  No payment methods are stored yet (correct for MVP).
  Ready to wire to Razorpay / Stripe / Paystack later.
*/

export default function PaymentsPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Payment Methods
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Manage how you pay for your orders
        </p>
      </header>

      {/* CONTENT */}
      <section
        style={{
          marginTop: 28,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          padding: 24,
          display: "grid",
          gap: 22,
        }}
      >
        {/* SAVED METHODS */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 900 }}>
            Saved payment methods
          </h3>
          <p
            style={{
              fontSize: 13,
              opacity: 0.6,
              marginTop: 4,
            }}
          >
            You don’t have any saved payment methods yet.
          </p>

          <div
            style={{
              marginTop: 14,
              padding: 18,
              borderRadius: 16,
              border: "1px dashed #cbd5f5",
              background: "#f8fafc",
              fontSize: 14,
            }}
          >
            For security reasons, card details are never
            stored directly on our servers.
          </div>
        </div>

        <hr />

        {/* AVAILABLE METHODS */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 900 }}>
            Available payment options
          </h3>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <PaymentOption
              title="UPI / Wallets"
              description="Pay using UPI apps or supported wallets"
            />
            <PaymentOption
              title="Credit / Debit Cards"
              description="Visa, Mastercard, RuPay"
            />
            <PaymentOption
              title="Cash on Delivery"
              description="Pay when your order is delivered"
            />
          </div>
        </div>

        <hr />

        {/* ACTION */}
        <div>
          <button
            className="btn btnTech"
            onClick={() =>
              toast(
                "Saved payment methods will be available soon"
              )
            }
          >
            + Add payment method
          </button>
        </div>
      </section>
    </div>
  );
}

/* ======================
   COMPONENTS
====================== */

function PaymentOption({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div
        style={{
          fontSize: 13,
          opacity: 0.6,
          marginTop: 4,
        }}
      >
        {description}
      </div>
    </div>
  );
}
