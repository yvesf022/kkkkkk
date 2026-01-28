"use client";

import { useRouter } from "next/navigation";

export default function PaymentsPage() {
  const router = useRouter();

  return (
    <div
      style={{
        maxWidth: 900,
        display: "grid",
        gap: 28,
      }}
    >
      {/* CONTEXT */}
      <div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          Account › Payments
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            marginTop: 6,
          }}
        >
          How payments work
        </h1>
        <p
          style={{
            fontSize: 14,
            opacity: 0.6,
            marginTop: 6,
          }}
        >
          Payments are handled securely and verified manually for
          your protection.
        </p>
      </div>

      {/* TRUST / SECURITY */}
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          background: "#f8fafc",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        🔒 <strong>Security first.</strong>  
        For your safety, payment details are never stored on your
        account and are not processed directly on this website.
      </div>

      {/* STEP FLOW */}
      <section
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        {[
          {
            step: "1",
            title: "Place your order",
            desc: "Your order is created and marked as “Awaiting payment.”",
          },
          {
            step: "2",
            title: "Pay externally",
            desc: "Complete the payment using the instructions provided after checkout.",
          },
          {
            step: "3",
            title: "Upload payment proof",
            desc: "From your order details page, upload your payment confirmation.",
          },
          {
            step: "4",
            title: "Verification",
            desc: "Our team reviews the payment for verification.",
          },
          {
            step: "5",
            title: "Shipping",
            desc: "Once confirmed, your order proceeds to shipping.",
          },
        ].map((s) => (
          <div
            key={s.step}
            style={{
              padding: 20,
              borderRadius: 20,
              background:
                "linear-gradient(135deg,#ffffff,#f8fbff)",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.12)",
              display: "grid",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                opacity: 0.6,
              }}
            >
              Step {s.step}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              {s.title}
            </div>
            <div
              style={{
                fontSize: 14,
                opacity: 0.65,
              }}
            >
              {s.desc}
            </div>
          </div>
        ))}
      </section>

      {/* STATUS EXPLANATION */}
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          background: "#f8fafc",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <strong>Order status you may see:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          <li>
            <strong>Awaiting payment</strong> – Payment has not yet
            been verified.
          </li>
          <li>
            <strong>Payment confirmed</strong> – Your payment was
            approved.
          </li>
          <li>
            <strong>Payment rejected</strong> – Uploaded proof could
            not be verified.
          </li>
        </ul>
        You will only be asked to take action if verification
        fails.
      </div>

      {/* REASSURANCE */}
      <div
        style={{
          fontSize: 14,
          opacity: 0.7,
          lineHeight: 1.6,
        }}
      >
        ⏳ <strong>During verification:</strong>  
        There is nothing else you need to do unless contacted by
        our team. Verification time may vary depending on payment
        method and volume.
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <button
          className="btn btnPrimary"
          onClick={() => router.push("/account/orders")}
        >
          View my orders
        </button>

        <button
          className="btn btnTech"
          onClick={() => router.push("/store")}
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}
