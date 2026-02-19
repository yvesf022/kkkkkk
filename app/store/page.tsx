import { Suspense } from "react";
import StoreClient from "./StoreClient";

export const dynamic = "force-dynamic";

export default function StorePage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#fafaf8", minHeight: "100vh" }}>
        {/* Header skeleton */}
        <div style={{ background: "linear-gradient(160deg, #08091a, #0a1845 50%, #003520)", padding: "72px 80px 56px" }}>
          <div style={{ maxWidth: 1440, margin: "0 auto" }}>
            <div style={{ height: 12, width: 120, borderRadius: 6, background: "rgba(255,255,255,0.15)", marginBottom: 16 }} />
            <div style={{ height: 52, width: 280, borderRadius: 8, background: "rgba(255,255,255,0.12)", marginBottom: 12 }} />
            <div style={{ height: 16, width: 200, borderRadius: 6, background: "rgba(255,255,255,0.08)" }} />
          </div>
        </div>
        {/* Grid skeleton */}
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 64px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "#f1f0ee", animationDelay: `${i * 40}ms` }}>
                <div style={{ paddingTop: "100%", background: "linear-gradient(90deg, #f1f0ee 0%, #e4e2de 50%, #f1f0ee 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite" }} />
                <div style={{ padding: 14 }}>
                  <div style={{ height: 13, borderRadius: 6, background: "#e4e2de", marginBottom: 8 }} />
                  <div style={{ height: 16, width: "45%", borderRadius: 6, background: "#e4e2de" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
      </div>
    }>
      <StoreClient />
    </Suspense>
  );
}