import { Suspense } from "react";
import StoreClient from "./StoreClient";

export const dynamic = "force-dynamic";

function StoreSkeleton() {
  return (
    <div style={{ background: "#fafaf8", minHeight: "100vh" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -800px 0; }
          100% { background-position: 800px 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sk-pulse {
          background: linear-gradient(90deg, #ececea 0%, #e0dedd 40%, #ececea 80%);
          background-size: 800px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 6px;
        }
        .sk-pulse-dark {
          background: linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.16) 40%, rgba(255,255,255,0.08) 80%);
          background-size: 800px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 6px;
        }
        .sk-card {
          border-radius: 16px;
          overflow: hidden;
          background: white;
          border: 1px solid #ece9e4;
          animation: fadeIn 0.4s ease both;
        }
        .sk-card-img {
          padding-top: 100%;
          background: linear-gradient(90deg, #f1f0ee 0%, #e4e2de 40%, #f1f0ee 80%);
          background-size: 800px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* ── Hero skeleton ── */}
      <div style={{
        background: "linear-gradient(160deg, #08091a, #0a1845 50%, #003520)",
        padding: "64px 80px 52px",
      }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div className="sk-pulse-dark" style={{ height: 10, width: 100, marginBottom: 20 }} />
          <div className="sk-pulse-dark" style={{ height: 44, width: 260, marginBottom: 14 }} />
          <div className="sk-pulse-dark" style={{ height: 14, width: 180, marginBottom: 32 }} />
          {/* Hero product grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gridTemplateRows: "200px 160px",
            gap: 3,
            borderRadius: 16,
            overflow: "hidden",
            maxWidth: 860,
          }}>
            <div style={{ gridColumn: 1, gridRow: "1 / span 2" }} className="sk-pulse-dark" />
            <div className="sk-pulse-dark" />
            <div className="sk-pulse-dark" />
            <div className="sk-pulse-dark" />
            <div className="sk-pulse-dark" />
          </div>
        </div>
      </div>

      {/* ── Filter bar skeleton ── */}
      <div style={{ background: "white", borderBottom: "1px solid #ece9e4", padding: "14px 80px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="sk-pulse" style={{ height: 36, width: 240, borderRadius: 10 }} />
          {[80, 100, 70, 90, 75].map((w, i) => (
            <div key={i} className="sk-pulse" style={{ height: 32, width: w, borderRadius: 20, animationDelay: `${i * 80}ms` }} />
          ))}
          <div style={{ marginLeft: "auto" }}>
            <div className="sk-pulse" style={{ height: 32, width: 110, borderRadius: 8 }} />
          </div>
        </div>
      </div>

      {/* ── Category sections skeleton ── */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "36px 80px 60px" }}>
        {[
          { width: 160, delay: 0 },
          { width: 130, delay: 120 },
          { width: 150, delay: 240 },
        ].map((section, si) => (
          <div key={si} style={{ marginBottom: si < 2 ? 48 : 0 }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="sk-pulse" style={{ height: 28, width: 28, borderRadius: "50%" }} />
                <div className="sk-pulse" style={{ height: 22, width: section.width }} />
              </div>
              <div className="sk-pulse" style={{ height: 14, width: 55 }} />
            </div>
            {/* Cards row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="sk-card" style={{ animationDelay: `${section.delay + i * 55}ms` }}>
                  <div className="sk-card-img" />
                  <div style={{ padding: "12px 14px 14px" }}>
                    <div className="sk-pulse" style={{ height: 12, marginBottom: 7 }} />
                    <div className="sk-pulse" style={{ height: 12, width: `${55 + (i % 3) * 10}%`, marginBottom: 10 }} />
                    <div className="sk-pulse" style={{ height: 18, width: "42%", borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <StoreClient />
    </Suspense>
  );
}