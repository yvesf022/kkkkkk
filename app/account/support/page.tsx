"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SupportPage() {
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");

  function handleSubmit() {
    toast("Support messaging will be available soon");
  }

  return (
    <div className="pageContentWrap">
      {/* PAGE HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div className="mutedText">Account › Support</div>
        <h1 className="pageTitle">Support</h1>
        <p className="pageSubtitle">
          Get help with your orders, payments, or account.
        </p>
      </div>

      {/* HOW SUPPORT WORKS */}
      <section className="card">
        <h2 className="sectionTitle">How support works</h2>

        <ul className="list">
          <li>
            For <strong>payment or shipping issues</strong>, open the
            related order to view its status and next steps.
          </li>
          <li>
            For <strong>delivery address changes</strong>, update your
            saved addresses before placing a new order.
          </li>
          <li>
            For <strong>account access or profile issues</strong>, you
            can contact our support team using the form below.
          </li>
        </ul>
      </section>

      {/* QUICK ACTIONS */}
      <section className="card">
        <h2 className="sectionTitle">Quick actions</h2>

        <div className="actionList">
          <Link href="/account/orders" className="btn btnPrimary">
            View my orders
          </Link>

          <Link href="/account/profile" className="btn btnGhost">
            Update profile information
          </Link>
        </div>
      </section>

      {/* SUPPORT FORM */}
      <section className="card">
        <h2 className="sectionTitle">Contact support</h2>

        <p className="mutedText">
          Use this form for account-related questions or issues that
          cannot be resolved from your order details page.
        </p>

        <div className="formGrid" style={{ marginTop: 16 }}>
          <input
            placeholder="Order ID (optional)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />

          <textarea
            placeholder="Describe your issue or question"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
        </div>

        <button
          className="btn btnPrimary"
          style={{ marginTop: 18 }}
          onClick={handleSubmit}
        >
          Send message
        </button>

        <p className="mutedText" style={{ marginTop: 10 }}>
          Support ticket submission is coming soon. For now, please
          include your order ID when contacting support.
        </p>
      </section>

      {/* TRUST / REASSURANCE */}
      <div className="infoBox">
        💬 <strong>Response time:</strong>  
        Our support team typically responds within 24–48 hours during
        business days. Payment verification and shipping updates are
        handled through your order page.
      </div>
    </div>
  );
}
