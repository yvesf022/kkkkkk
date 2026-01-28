import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="pageContentWrap">
          <p className="mutedText">
            Finalizing your order…
          </p>
        </div>
      }
    >
      <OrderSuccessClient />
    </Suspense>
  );
}
