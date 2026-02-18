"use client";

import { useEffect, useState } from "react";
import { couponsApi } from "@/lib/api";

export default function CouponsPage() {
  const [available, setAvailable] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [orderTotal, setOrderTotal] = useState("");
  const [applyResult, setApplyResult] = useState<any>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try {
      const [a, m] = await Promise.allSettled([couponsApi.getAvailable(), couponsApi.getMy()]);
      if (a.status === "fulfilled") setAvailable((a.value as any) ?? []);
      if (m.status === "fulfilled") setMine((m.value as any) ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); }

  async function apply() {
    if (!code || !orderTotal) return;
    try {
      const result = await couponsApi.apply(code, Number(orderTotal));
      setApplyResult(result);
      flash("Coupon applied!");
    } catch (e: any) { flash(e?.message ?? "Invalid coupon", false); setApplyResult(null); }
  }

  function copyCode(c: string) {
    navigator.clipboard.writeText(c).then(() => flash(`Copied: ${c}`));
  }

  if (loading) return <div style={{ color: "#64748b" }}>Loading coupons...</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>My Coupons</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>Your discount codes and available offers.</p>

      {msg && <div style={{ ...banner, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b", marginBottom: 16 }}>{msg.text}</div>}

      {/* TEST A COUPON */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={sectionTitle}>Check a Coupon</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ ...input, width: 160, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }} />
          <input placeholder="Order total (R)" type="number" value={orderTotal} onChange={(e) => setOrderTotal(e.target.value)}
            style={{ ...input, width: 140 }} />
          <button onClick={apply} disabled={!code || !orderTotal} style={greenBtn}>Apply</button>
        </div>
        {applyResult && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 14, color: "#166534" }}>
            Discount: <strong>R {Number(applyResult.discount ?? 0).toLocaleString()}</strong> — 
            You pay: <strong>R {Number(applyResult.final_amount ?? 0).toLocaleString()}</strong>
          </div>
        )}
      </div>

      {/* MY COUPONS */}
      {mine.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={sectionTitle}>Your Coupons</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {mine.map((c: any, i: number) => <CouponCard key={i} coupon={c} onCopy={copyCode} />)}
          </div>
        </div>
      )}

      {/* AVAILABLE */}
      {available.length > 0 && (
        <div>
          <h3 style={sectionTitle}>Available Offers</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {available.map((c: any, i: number) => <CouponCard key={i} coupon={c} onCopy={copyCode} />)}
          </div>
        </div>
      )}

      {mine.length === 0 && available.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏷️</div>
          <div style={{ color: "#64748b" }}>No coupons available right now.</div>
        </div>
      )}
    </div>
  );
}

function CouponCard({ coupon, onCopy }: { coupon: any; onCopy: (c: string) => void }) {
  const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 12, border: `2px dashed ${expired ? "#e2e8f0" : "#0033a0"}`, background: expired ? "#f8fafc" : "#eff6ff", flexWrap: "wrap", gap: 12, opacity: expired ? 0.6 : 1 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1, color: expired ? "#94a3b8" : "#0033a0" }}>{coupon.code}</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
          {coupon.discount_type === "percent" ? `${coupon.discount_value}% off` : `R ${coupon.discount_value} off`}
          {coupon.min_order && ` · Min order R ${coupon.min_order}`}
        </div>
        {coupon.expires_at && <div style={{ fontSize: 11, color: expired ? "#dc2626" : "#94a3b8", marginTop: 2 }}>{expired ? "Expired" : `Expires ${new Date(coupon.expires_at).toLocaleDateString()}`}</div>}
      </div>
      {!expired && <button onClick={() => onCopy(coupon.code)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #0033a0", background: "#fff", color: "#0033a0", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Copy</button>}
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" };
const greenBtn: React.CSSProperties = { padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0033a0,#009543)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const input: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 };
const banner: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid", fontSize: 14 };