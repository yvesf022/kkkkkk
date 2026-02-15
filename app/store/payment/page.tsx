import { Suspense } from "react";
import PaymentClient from "./PaymentClient";

export const dynamic = "force-dynamic";

export default function PaymentPage() {
  return (
    <Suspense fallback={<div style={{ padding: 100 }}>Loading...</div>}>
      <PaymentClient />
    </Suspense>
  );
}
