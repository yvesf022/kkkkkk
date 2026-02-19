import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

/**
 * Order Success Page
 *
 * FIX: Checkmark "✓" was rendered as "â"" due to UTF-8 encoding issue.
 * Now using HTML entity &#x2713; to ensure correct rendering.
 */
export default function OrderSuccessPage() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "100px 20px",
      }}
    >
      <div
        style={{
          padding: 60,
          borderRadius: 28,
          background: "#ffffff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        {/* SUCCESS ICON */}
        <div
          style={{
            width: 100,
            height: 100,
            margin: "0 auto 40px",
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            display: "grid",
            placeItems: "center",
            fontSize: 44,
            color: "#fff",
            fontWeight: 900,
          }}
        >
          &#x2713;
        </div>

        {/* TITLE */}
        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          Order Confirmed
        </h1>

        {/* CLEAR INSTRUCTION */}
        <p
          style={{
            fontSize: 17,
            opacity: 0.7,
            marginBottom: 50,
          }}
        >
          Your order has been created successfully.
          <br />
          Please proceed to payment to complete your purchase.
        </p>

        {/* ORDER INFO */}
        <Suspense fallback={<p>Loading order details...</p>}>
          <OrderSuccessClient />
        </Suspense>
      </div>
    </div>
  );
}