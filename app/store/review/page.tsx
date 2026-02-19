import { Suspense } from "react";
import WriteReviewPage from "./WriteReviewClient";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 100, textAlign: "center", color: "#64748b" }}>Loading...</div>}>
      <WriteReviewPage />
    </Suspense>
  );
}