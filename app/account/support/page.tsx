"use client";

import Link from "next/link";

export default function SupportPage() {
  return (
    <div style={{ maxWidth: 800, display: "grid", gap: 24 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Support
        </h1>
        <p style={{ marginTop: 6, opacity: 0.6 }}>
          Get help with your orders, payments, or account.
        </p>
      </header>

      {/* HOW SUPPORT WORKS */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          padding: 24,
          display: "grid",
          gap: 14,
        }}
      >
        <h3 style={{ fontWeight: 900 }}>
          How support works
        </h3>

        <ul
          style={{
            paddingLeft: 18,
            display: "grid",
            gap: 8,
            fontSize: 14,
          }}
        >
          <li>
            For <b>payment or shipping issues</b>, open the relevant order
            to view its status and next steps.
          </li>
          <li>
            For <b>delivery address</b> changes, update your saved addresses
            before placing a new order.
          </li>
          <li>
            For <b>account access</b> or profile issues, contact our support team
            directly.
          </li>
        </ul>
      </section>

      {/* QUICK LINKS */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          padding: 24,
          display: "grid",
          gap: 12,
        }}
      >
        <h3 style={{ fontWeight: 900 }}>
          Quick actions
        </h3>

        <Link
          href="/account/orders"
          className="btn btnPrimary"
          style={{ width: "fit-content" }}
        >
          View my orders
        </Link>

        <Link
          href="/account/profile"
          className="btn btnGhost"
          style={{ width: "fit-content" }}
        >
          Update profile information
        </Link>
      </section>

      {/* CONTACT */}
      <section
        style={{
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          borderRadius: 22,
          padding: 24,
          fontSize: 13,
          opacity: 0.75,
        }}
      >
        If you need further assistance, please contact our support team
        with your order ID. Support ticket submission will be available
        in a future update.
      </section>
    </div>
  );
}
