import { Suspense } from "react";
import Link from "next/link";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "48px 20px",
        textAlign: "center",
      }}
    >
      {/* SUCCESS ICON */}
      <div
        style={{
          width: 90,
          height: 90,
          margin: "0 auto 24px",
          borderRadius: "50%",
          background: "linear-gradient(135deg,#16a34a,#22c55e)",
          display: "grid",
          placeItems: "center",
          fontSize: 42,
          color: "#fff",
          boxShadow: "0 20px 50px rgba(34,197,94,0.4)",
        }}
      >
        ✓
      </div>

      <h1
        style={{
          fontSize: 32,
          fontWeight: 900,
          marginBottom: 12,
        }}
      >
        Order Successfully Created
      </h1>

      <p
        style={{
          fontSize: 16,
          opacity: 0.7,
          marginBottom: 32,
        }}
      >
        Your order has been placed and is currently{" "}
        <strong>Pending Payment</strong>.
        <br />
        To process your order, please complete your payment
        and upload proof.
      </p>

      <Suspense
        fallback={
          <div
            style={{
              padding: 24,
              borderRadius: 18,
              background: "#ffffff",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.1)",
            }}
          >
            Loading order details…
          </div>
        }
      >
        <OrderSuccessClient />
      </Suspense>

      {/* ACTION BUTTONS */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/store"
          className="btn btnGhost"
        >
          Continue Shopping
        </Link>

        <Link
          href="/store/pay"
          className="btn btnPrimary"
        >
          Proceed to Payment
        </Link>
      </div>
    </div>
  );
}
