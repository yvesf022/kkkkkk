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
            Thank you for your order. Please complete
            payment to proceed.
          </p>
        </div>

        {/* ORDER REFERENCE */}
        {orderId && (
          <div
            className="infoBox"
            style={{ marginBottom: 20 }}
          >
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
              Your order has been created successfully.
            </li>
            <li>
              Proceed to your order details to submit
              payment proof.
            </li>
            <li>
              Our team will manually verify the payment.
            </li>
            <li>
              Once approved, your order will move to
              shipping.
            </li>
          </ul>
        </section>

        {/* TRUST NOTE */}
        <div
          className="infoBox"
          style={{ marginBottom: 24 }}
        >
          🔒 <strong>Your security matters.</strong>
          <br />
          Payments are verified manually and securely.
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
          {orderId && (
            <Link
              href={`/account/orders/${orderId}`}
              className="btn btnPrimary"
            >
              Go to order details
            </Link>
          )}

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
