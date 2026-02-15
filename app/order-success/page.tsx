import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "60px 24px",
      }}
    >
      <div
        style={{
          borderRadius: 28,
          padding: 50,
          background: "var(--gradient-surface)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* SUCCESS HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--gradient-primary)",
              display: "grid",
              placeItems: "center",
              fontSize: 36,
              color: "#fff",
              fontWeight: 900,
            }}
          >
            ✓
          </div>

          <div>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 900,
                marginBottom: 8,
              }}
            >
              Order Successfully Created
            </h1>

            <p style={{ opacity: 0.7 }}>
              Your order is now <strong>Pending Payment</strong>.
              Please complete your payment to begin processing.
            </p>
          </div>
        </div>

        {/* ORDER DETAILS */}
        <Suspense
          fallback={
            <div
              style={{
                padding: 24,
                borderRadius: 16,
                background: "#ffffff",
                boxShadow: "var(--shadow-md)",
              }}
            >
              Loading order details…
            </div>
          }
        >
          <OrderSuccessClient />
        </Suspense>

        {/* NEXT STEP SECTION */}
        <div
          style={{
            marginTop: 40,
            padding: 30,
            borderRadius: 22,
            background: "linear-gradient(135deg,#f0fdf4,#ecfdf5)",
            display: "grid",
            gap: 20,
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Complete Payment to Activate Your Order
          </h2>

          <p style={{ opacity: 0.7 }}>
            Once payment is received and verified,
            your order status will be updated automatically.
          </p>

          <a
            href="/store/pay"
            className="btn btnPrimary"
            style={{
              width: "fit-content",
              padding: "16px 32px",
              fontSize: 16,
            }}
          >
            Proceed to Payment →
          </a>
        </div>
      </div>
    </div>
  );
}
