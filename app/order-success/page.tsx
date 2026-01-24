import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading order…</div>}>
      <OrderSuccessClient />
    </Suspense>
  );
}
