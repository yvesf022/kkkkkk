"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="pageContentWrap">
      <section
        className="card"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="pageTitle">
            Order placed successfully
          </h1>
          <p className="pageSubtitle">
            Thank you for your order. We’re preparing the
            next steps.
          </p>
        </div>

        {/* ORDER REFERENCE */}
        {orderId && (
          <div className="infoBox" style={{ marginBottom: 20 }}>
            <strong>Order reference:</strong>
            <div>{orderId}</div>
          </div>
        )}

        {/* WHAT HAPPENS NEXT */}
        <section
          style={{
            textAlign: "left",
            marginBottom: 28,
          }}
        >
          <h2 className="sectionTitle">
            What happens next
          </h2>

          <ul className="list">
            <li>
              Your order is now marked as{" "}
              <strong>Awaiting payment</strong>.
            </li>
            <li>
              Complete your payment externally using the
              instructions provided.
            </li>
            <li>
              Upload your payment proof from your order
              details page.
            </li>
            <li>
              Our team will verify the payment manually.
            </li>
            <li>
              Once confirmed, your order will move to
              shipping.
            </li>
          </ul>
        </section>

        {/* TRUST NOTE */}
        <div className="infoBox" style={{ marginBottom: 24 }}>
          🔒 <strong>Your security matters.</strong>
          <br />
          Payment details are never stored on your account.
          All payments are verified manually for your
          protection.
        </div>

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/account/orders"
            className="btn btnPrimary"
          >
            View my orders
          </Link>

          <Link
            href="/store"
            className="btn btnGhost"
          >
            Continue shopping
          </Link>
        </div>
      </section>
    </div>
  );
}
