"use client";

import Link from "next/link";

export default function PaymentsPage() {
  return (
    <div style={{ maxWidth: 900, display: "grid", gap: 28 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Payments
        </h1>
        <p style={{ marginTop: 6, opacity: 0.65 }}>
          Learn how payments are processed for your orders.
        </p>
      </header>

      {/* HOW PAYMENTS WORK */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 28,
          display: "grid",
          gap: 14,
        }}
      >
        <h3 style={{ fontWeight: 900 }}>
          How payments work
        </h3>

        <ol
          style={{
            paddingLeft: 18,
            display: "grid",
            gap: 8,
            fontSize: 14,
          }}
        >
          <li>You place an order and it is marked as <b>Awaiting payment</b>.</li>
          <li>
            You complete the payment externally using the instructions
            provided after checkout.
          </li>
          <li>
            You upload a payment proof from your order details page.
          </li>
          <li>
            Our team reviews the payment for verification.
          </li>
          <li>
            Once confirmed, your order proceeds to shipping.
          </li>
        </ol>

        <p style={{ fontSize: 13, opacity: 0.65 }}>
          For security reasons, payment details are never stored
          on your account.
        </p>
      </section>

      {/* WHERE TO MANAGE PAYMENTS */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 28,
          display: "grid",
          gap: 12,
        }}
      >
        <h3 style={{ fontWeight: 900 }}>
          Manage payments
        </h3>

        <p style={{ fontSize: 14, opacity: 0.7 }}>
          All payment actions are handled per order.
          To upload payment proof or view payment status,
          open the corresponding order.
        </p>

        <Link
          href="/account/orders"
          className="btn btnPrimary"
          style={{ width: "fit-content", marginTop: 6 }}
        >
          View my orders
        </Link>
      </section>

      {/* SUPPORT */}
      <section
        style={{
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
          fontSize: 13,
          opacity: 0.75,
        }}
      >
        If you have questions about a payment,
        please contact support with your order ID.
      </section>
    </div>
  );
}
