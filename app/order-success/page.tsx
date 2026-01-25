import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "rgba(15,23,42,0.6)",
            fontWeight: 600,
          }}
        >
          Loading your order…
        </div>
      }
    >
      <OrderSuccessClient />
    </Suspense>
  );
}
