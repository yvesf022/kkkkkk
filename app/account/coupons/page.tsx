"use client";

import { useEffect, useState } from "react";
import { couponsApi } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

export default function CouponsPage() {
  const [available, setAvailable] = useState<Coupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([couponsApi.getAvailable(), couponsApi.getMy()])
      .then(([a, m]) => {
        if (a.status === "fulfilled") setAvailable((a.value as any) ?? []);
        if (m.status === "fulfilled") setMyCoupons((m.value as any) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function isExpired(coupon: Coupon) {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  }

  function isNotStarted(coupon: Coupon) {
    if (!coupon.valid_from) return false;
    return new Date(coupon.valid_from) > new Date();
  }

  const displayList = tab === "available" ? available : myCoupons;

  if (loading) return <div style={{ color: "#64748b" }}>Loading coupons...</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Coupons & Offers</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Exclusive discounts and savings for your next purchase.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#f1f5f9", borderRadius: 12, padding: 4 }}>
        {(["available", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ flex: 1, padding: "9px 16px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: tab === t ? "#fff" : "transparent", color: tab === t ? "#0f172a" : "#64748b", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}
          >
            {t === "available" ? `Available (${available.length})` : `My Coupons (${myCoupons.length})`}
          </button>
        ))}
      </div>

      {displayList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
            {tab === "available" ? "No coupons available right now" : "No coupons yet"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 14 }}>
            {tab === "available" ? "Check back later for new deals." : "Make a purchase to earn coupons!"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {displayList.map((c) => {
            const expired = isExpired(c);
            const notStarted = isNotStarted(c);
            const unavailable = expired || notStarted || !c.is_active;

            return (
              <div
                key={c.id}
                style={{
                  background: "#fff", borderRadius: 16, border: `1px solid ${unavailable ? "#e5e7eb" : "#0f172a"}`,
                  overflow: "hidden", opacity: unavailable ? 0.6 : 1, display: "flex",
                }}
              >
                {/* Left accent */}
                <div style={{ width: 8, background: unavailable ? "#e5e7eb" : "linear-gradient(180deg, #0033a0, #009543)", flexShrink: 0 }} />

                {/* Content */}
                <div style={{ flex: 1, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {/* Discount badge */}
                  <div style={{ textAlign: "center", minWidth: 80, flexShrink: 0 }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : formatCurrency(c.discount_value)}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                      {c.discount_type === "percentage" ? "OFF" : "DISCOUNT"}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, alignSelf: "stretch", background: "#f1f5f9", flexShrink: 0 }} />

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {c.description && <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{c.description}</div>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#64748b" }}>
                      {c.min_purchase && <span>Min order: {formatCurrency(c.min_purchase)}</span>}
                      {c.max_discount && <span>Max discount: {formatCurrency(c.max_discount)}</span>}
                      {c.usage_limit && <span>Limit: {c.usage_count}/{c.usage_limit} used</span>}
                    </div>
                    {c.valid_until && (
                      <div style={{ fontSize: 11, color: expired ? "#dc2626" : "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                        {expired ? "⚠️ Expired" : `⏰ Valid until ${new Date(c.valid_until).toLocaleDateString()}`}
                      </div>
                    )}
                    {notStarted && c.valid_from && (
                      <div style={{ fontSize: 11, color: "#92400e", marginTop: 4, fontWeight: 600 }}>
                        🕐 Starts {new Date(c.valid_from).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Copy code */}
                  {!unavailable && (
                    <button
                      onClick={() => copyCode(c.code, c.id)}
                      style={{ flexShrink: 0, padding: "10px 16px", borderRadius: 10, border: `2px dashed ${copiedId === c.id ? "#166534" : "#0f172a"}`, background: copiedId === c.id ? "#f0fdf4" : "#f8fafc", color: copiedId === c.id ? "#166534" : "#0f172a", fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 1, transition: "all 0.15s" }}
                    >
                      {copiedId === c.id ? "✓ Copied!" : c.code}
                    </button>
                  )}
                  {unavailable && (
                    <div style={{ padding: "10px 16px", borderRadius: 10, border: "2px dashed #d1d5db", color: "#94a3b8", fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
                      {c.code}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}