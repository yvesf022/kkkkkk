import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: "80px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          padding: 50,
          borderRadius: 24,
          background: "#ffffff",
          boxShadow: "0 25px 60px rgba(0,0,0,0.08)",
        }}
      >
        {/* BIG SUCCESS ICON */}
        <div
          style={{
            width: 90,
            height: 90,
            margin: "0 auto 30px",
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            display: "grid",
            placeItems: "center",
            fontSize: 40,
            color: "#fff",
            fontWeight: 900,
          }}
        >
          ✓
        </div>

        {/* TITLE */}
        <h1
          style={{
            fontSize: 30,
            fontWeight: 900,
            marginBottom: 10,
          }}
        >
          Order Confirmed
        </h1>

        {/* SIMPLE INSTRUCTION */}
        <p
          style={{
            fontSize: 16,
            opacity: 0.7,
            marginBottom: 40,
          }}
        >
          Next step: Complete your payment.
        </p>

        {/* ORDER DETAILS */}
        <Suspense fallback={<p>Loading...</p>}>
          <OrderSuccessClient />
        </Suspense>

        {/* SINGLE CLEAR BUTTON */}
        <div style={{ marginTop: 40 }}>
          <a
            href="/store/pay"
            className="btn btnPrimary"
            style={{
              padding: "16px 40px",
              fontSize: 18,
            }}
          >
            Proceed to Payment →
          </a>
        </div>
      </div>
    </div>
  );
}
