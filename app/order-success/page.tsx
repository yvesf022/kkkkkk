import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <div
      className="pageContentWrap"
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 16px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginBottom: 8,
        }}
      >
        Order Confirmed
      </h1>

      <p
        style={{
          opacity: 0.7,
          marginBottom: 24,
        }}
      >
        Thank you for your purchase. We are processing your order.
      </p>

      <Suspense
        fallback={
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              background:
                "linear-gradient(135deg,#ffffff,#f4f9ff)",
              boxShadow:
                "0 18px 50px rgba(15,23,42,0.14)",
            }}
          >
            <p className="mutedText">
              Finalizing your order details…
            </p>
          </div>
        }
      >
        <OrderSuccessClient />
      </Suspense>
    </div>
  );
}
