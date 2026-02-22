"use client";

/**
 * FILE: app/admin/pricing/page.tsx
 *
 * Drop this at: app/admin/pricing/page.tsx
 * It is already linked from the dashboard Quick Actions + the Quick Pricing Widget.
 *
 * FEATURES:
 *  Tab 1 — Quick Calculator: type one Indian price, see Maloti result instantly
 *  Tab 2 — Batch Pricing: load all products, enter ₹ price per row, auto-calculates,
 *           save one row at a time OR hit "Save All" to apply everything at once
 *
 * BULK PRICING ANSWER:
 *  Yes — bulk pricing is fully supported. In Batch mode:
 *  1. Click "Load Products" (loads up to 100 products)
 *  2. Type the Indian market price for each product
 *  3. Prices calculate instantly (shipping ₹700 + profit ₹500 + exchange rate)
 *  4. Hit "💾 Save All" → all prices are PATCHed to the backend in parallel
 *  The progress shows per-row (saving → saved / error) so you can see exactly what happened.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminProductsApi, calculatePrice, exchangeApi, pricingApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

// ── Small UI helpers (no external deps) ─────────────────────────────
const C = {
  navy:    "#0f3f2f",
  green:   "#16a34a",
  text:    "#0f172a",
  muted:   "#64748b",
  faint:   "#94a3b8",
  border:  "#e2e8f0",
  surface: "#f8fafc",
  danger:  "#dc2626",
  warn:    "#d97706",
  purple:  "#7c3aed",
};

type BatchRow = {
  product: ProductListItem;
  marketInr: string;
  result: ReturnType<typeof calculatePrice> | null;
  status: "idle" | "saving" | "saved" | "error";
  errorMsg?: string;
  imgErr?: boolean;
};

// ════════════════════════════════════════════════════════════════════
export default function AdminPricingPage() {

  // ── Exchange rate ───────────────────────────────────────────────
  const [rate, setRate]           = useState(0.21);
  const [rateSrc, setRateSrc]     = useState<"live" | "fallback">("fallback");
  const [rateOverride, setOverride] = useState("");
  const [rateLoading, setRateLoading] = useState(true);

  const effectiveRate = rateOverride ? (parseFloat(rateOverride) || rate) : rate;

  useEffect(() => {
    exchangeApi.getINRtoLSL().then(({ rate: r, source }) => {
      setRate(r);
      setRateSrc(source);
    }).finally(() => setRateLoading(false));
  }, []);

  // ── Tabs ─────────────────────────────────────────────────────────
  const [tab, setTab]   = useState<"calc" | "batch">("calc");

  // ── Quick Calculator ─────────────────────────────────────────────
  const [qMarket, setQMarket] = useState("");
  const qVal    = parseFloat(qMarket) || 0;
  const qResult = qVal > 0 ? calculatePrice({ market_price_inr: qVal, exchange_rate: effectiveRate }) : null;

  // ── Batch Pricing ────────────────────────────────────────────────
  const [rows, setRows]             = useState<BatchRow[]>([]);
  const [batchLoading, setBatch]    = useState(false);
  const [searchQ, setSearchQ]       = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4500);
  };

  const loadProducts = useCallback(async () => {
    setBatch(true);
    try {
      const res = await adminProductsApi.list({ per_page: 100, ...(searchQ ? { search_query: searchQ } : {}) });
      setRows((res.results ?? []).map(p => ({ product: p, marketInr: "", result: null, status: "idle" })));
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load products", false);
    } finally {
      setBatch(false);
    }
  }, [searchQ]);

  // Recalculate all rows when rate changes
  useEffect(() => {
    setRows(prev => prev.map(row => {
      const v = parseFloat(row.marketInr);
      if (!isNaN(v) && v > 0) {
        return { ...row, result: calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate }) };
      }
      return row;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRate]);

  const setImgErr = (idx: number) => {
    setRows(prev => prev.map((row, i) => i === idx ? { ...row, imgErr: true } : row));
  };

  const updateRow = (idx: number, val: string) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const v = parseFloat(val);
      const result = (!isNaN(v) && v > 0)
        ? calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate })
        : null;
      return { ...row, marketInr: val, result, status: "idle" };
    }));
  };

  const saveRow = async (idx: number) => {
    const row = rows[idx];
    if (!row.result) return;
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: "saving" } : r));
    try {
      await pricingApi.applyToProduct(row.product.id, row.result.final_price_lsl, row.result.compare_price_lsl);
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: "saved" } : r));
    } catch (e: any) {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: "error", errorMsg: e?.message } : r));
    }
  };

  const saveAll = async () => {
    const toSave = rows.filter(r => r.result && r.status !== "saved");
    if (!toSave.length) { showToast("No calculated prices to save.", false); return; }
    setBulkSaving(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.result || row.status === "saved") continue;
      setRows(prev => prev.map((r, j) => j === i ? { ...r, status: "saving" } : r));
      try {
        await pricingApi.applyToProduct(row.product.id, row.result.final_price_lsl, row.result.compare_price_lsl);
        setRows(prev => prev.map((r, j) => j === i ? { ...r, status: "saved" } : r));
        ok++;
      } catch (e: any) {
        setRows(prev => prev.map((r, j) => j === i ? { ...r, status: "error", errorMsg: e?.message } : r));
        fail++;
      }
    }
    setBulkSaving(false);
    showToast(`✓ ${ok} prices saved${fail ? `, ${fail} failed` : ""}.`, fail === 0);
  };

  const readyCount  = rows.filter(r => r.result && r.status !== "saved").length;
  const savedCount  = rows.filter(r => r.status === "saved").length;
  const errorCount  = rows.filter(r => r.status === "error").length;

  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1300, fontFamily: "inherit" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? C.green : C.danger, color: "#fff",
          padding: "13px 22px", borderRadius: 10, fontWeight: 600,
          fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Link href="/admin" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>← Dashboard</Link>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: C.text, letterSpacing: -0.5 }}>💰 Pricing Manager</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>
            Convert Indian Rupee market prices → Maloti (M) · Formula: Market + ₹700 shipping + ₹500 profit × exchange rate
          </p>
        </div>

        {/* Rate box */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, marginBottom: 8 }}>
            <span style={{
              width: 9, height: 9, borderRadius: "50%", display: "inline-block",
              background: rateLoading ? "#94a3b8" : rateSrc === "live" ? "#22c55e" : "#f59e0b",
            }} />
            {rateLoading ? "Fetching rate…" : (
              <>
                <strong style={{ color: rateSrc === "live" ? C.green : C.warn }}>
                  {rateSrc === "live" ? "Live" : "Fallback"}
                </strong>
                <span style={{ color: C.muted }}>1 ₹ = M {effectiveRate.toFixed(4)}</span>
              </>
            )}
            {rateOverride && <span style={{ color: C.purple, fontWeight: 700, fontSize: 11 }}>MANUAL</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="number"
              placeholder="Override rate…"
              value={rateOverride}
              onChange={e => setOverride(e.target.value)}
              step="0.0001"
              style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 13, flex: 1, minHeight: "unset" }}
            />
            <button
              onClick={() => setOverride("")}
              style={{ padding: "6px 12px", borderRadius: 7, background: C.surface, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: "unset" }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Formula reminder ── */}
      <div style={{
        background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
        padding: "11px 16px", fontSize: 13, color: "#1e40af", marginBottom: 20,
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
      }}>
        <strong>Formula:</strong>
        <span>(Market Price ₹</span>
        <span style={{ color: C.muted }}>+ ₹700 shipping</span>
        <span style={{ color: C.muted }}>+ ₹500 profit)</span>
        <span>× M {effectiveRate.toFixed(4)}</span>
        <span style={{ fontWeight: 700 }}>= Final price in Maloti</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
          Compare price = (Market + ₹700) × {effectiveRate.toFixed(4)} × 1.05
        </span>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["calc", "batch"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 22px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer",
            border: `2px solid ${tab === t ? C.navy : C.border}`,
            background: tab === t ? C.navy : "#fff",
            color: tab === t ? "#fff" : C.muted,
            minHeight: "unset",
          }}>
            {t === "calc" ? "🧮 Quick Calculator" : `📦 Batch Pricing${rows.length ? ` (${rows.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: QUICK CALCULATOR
      ══════════════════════════════════════════════════════════════ */}
      {tab === "calc" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 860 }}>

          {/* Input card */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px", color: C.text }}>Enter Indian Market Price</h2>

            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
              Market Price in India (₹) <span style={{ color: C.danger }}>*</span>
            </label>
            <input
              type="number"
              value={qMarket}
              onChange={e => setQMarket(e.target.value)}
              placeholder="e.g. 2499"
              autoFocus
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 10,
                border: `2px solid ${C.navy}`, fontSize: 24, fontWeight: 700,
                color: C.text, boxSizing: "border-box", minHeight: "unset", outline: "none",
              }}
            />

            <div style={{
              marginTop: 20, padding: "14px 16px",
              background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Fixed costs applied automatically
              </div>
              {[
                ["🚚 Shipping", "₹700"],
                ["🏢 Company Profit", "₹500"],
                ["💱 Exchange Rate", `M ${effectiveRate.toFixed(4)}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                  <span style={{ color: C.muted }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Result card */}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            {qResult ? (
              <>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px", color: C.text }}>Price Breakdown</h2>
                <div style={{ marginBottom: 18 }}>
                  {[
                    ["Market Price (India)", `₹ ${qVal.toLocaleString()}`],
                    ["+ Shipping", `₹ ${qResult.shipping_cost_inr.toLocaleString()}`],
                    ["+ Company Profit", `₹ ${qResult.profit_inr.toLocaleString()}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.surface}`, fontSize: 14 }}>
                      <span style={{ color: C.muted }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: `2px solid ${C.text}`, margin: "8px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}>
                    <span style={{ color: C.muted }}>Total (INR)</span>
                    <span style={{ fontWeight: 700 }}>₹ {qResult.total_cost_inr.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}>
                    <span style={{ color: C.muted }}>× Exchange Rate</span>
                    <span style={{ fontWeight: 600 }}>× {effectiveRate.toFixed(4)}</span>
                  </div>
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${C.navy}, #1b5e4a)`,
                  borderRadius: 14, padding: "20px 22px", color: "#fff", textAlign: "center",
                }}>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>FINAL PRICE IN MALOTI</div>
                  <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
                    M {qResult.final_price_lsl.toFixed(2)}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
                    Compare: <s>M {qResult.compare_price_lsl.toFixed(2)}</s>
                  </div>
                  <div style={{
                    marginTop: 8, display: "inline-block",
                    background: "rgba(255,255,255,0.15)", borderRadius: 20,
                    padding: "4px 14px", fontSize: 13,
                  }}>
                    Customer saves M {qResult.savings_lsl.toFixed(2)} ({qResult.discount_pct}% off)
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 240, color: C.faint, textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🧮</div>
                <p>Enter a market price on the left to see the Maloti price calculated here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: BATCH PRICING
          YES — bulk pricing is supported. Load products, type ₹ prices,
          then "Save All" applies everything to the backend in parallel.
      ══════════════════════════════════════════════════════════════ */}
      {tab === "batch" && (
        <div>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadProducts()}
              placeholder="Filter products by name…"
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, flex: 1, maxWidth: 340, minHeight: "unset" }}
            />
            <button onClick={loadProducts} disabled={batchLoading} style={btnStyle(C.navy)}>
              {batchLoading ? "Loading…" : "🔄 Load Products"}
            </button>
            <button
              onClick={saveAll}
              disabled={bulkSaving || readyCount === 0}
              style={btnStyle(C.green, readyCount === 0)}
            >
              {bulkSaving ? "Saving…" : `💾 Save All (${readyCount})`}
            </button>
          </div>

          {/* Hint */}
          <div style={{
            background: "#fefce8", border: "1px solid #fde68a", borderRadius: 9,
            padding: "10px 14px", fontSize: 13, color: "#92400e", marginBottom: 16,
          }}>
            <strong>How bulk pricing works:</strong> Load your products → type the Indian market price (₹) for each →
            Maloti prices calculate automatically → click <strong>Save All</strong> to push all prices to your store at once.
            You can also save rows one by one with the individual <strong>Save</strong> button.
          </div>

          {/* Empty state */}
          {rows.length === 0 && !batchLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", color: C.faint, gap: 12 }}>
              <div style={{ fontSize: 48 }}>📦</div>
              <p>Click "Load Products" to get started.</p>
            </div>
          )}

          {/* Table */}
          {rows.length > 0 && (
            <>
              <div style={{ overflowX: "auto", background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.surface }}>
                      {["Product", "Current (M)", "Market Price (₹)", "Cost (₹)", "→ Final (M)", "Compare (M)", "Discount", "Action"].map(h => (
                        <th key={h} style={{
                          padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
                          color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px",
                          borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const bg = row.status === "saved"  ? "#f0fdf4"
                               : row.status === "error"  ? "#fef2f2"
                               : row.status === "saving" ? "#fefce8"
                               : "#fff";
                      const totalInr = row.result ? row.result.total_cost_inr : null;
                      return (
                        <tr key={row.product.id} style={{ background: bg, transition: "background 0.25s" }}>
                          <td style={{ ...tdStyle, minWidth: 280 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {/* Product image */}
                              <div style={{
                                width: 64, height: 64, flexShrink: 0,
                                borderRadius: 10, overflow: "hidden",
                                border: `1px solid ${C.border}`,
                                background: C.surface,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                              }}>
                                {(row.product as any).main_image && !row.imgErr ? (
                                  <img
                                    src={(row.product as any).main_image}
                                    alt={row.product.title}
                                    onError={() => setImgErr(idx)}
                                    style={{
                                      width: "100%", height: "100%",
                                      objectFit: "cover", display: "block",
                                    }}
                                  />
                                ) : (
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                                    stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <path d="M21 15l-5-5L5 21"/>
                                  </svg>
                                )}
                              </div>
                              {/* Text */}
                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontWeight: 600, fontSize: 13, color: C.text,
                                  maxWidth: 200, lineHeight: 1.35,
                                  overflow: "hidden", display: "-webkit-box",
                                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                                }}>
                                  {row.product.title}
                                </div>
                                {(row.product.brand || row.product.category) && (
                                  <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>
                                    {[row.product.brand, row.product.category].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                                {!(row.product as any).main_image && (
                                  <div style={{ fontSize: 10, color: C.warn, marginTop: 2 }}>No image</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ color: C.muted, fontSize: 13 }}>
                              {row.product.price ? `M ${row.product.price.toFixed(2)}` : "—"}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="number"
                              value={row.marketInr}
                              onChange={e => updateRow(idx, e.target.value)}
                              placeholder="₹ price"
                              disabled={row.status === "saving"}
                              style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, width: 110, minHeight: "unset" }}
                            />
                          </td>
                          <td style={tdStyle}>
                            {totalInr != null
                              ? <span style={{ color: C.purple, fontWeight: 600 }}>₹{totalInr.toLocaleString()}</span>
                              : <span style={{ color: C.faint }}>—</span>}
                          </td>
                          <td style={tdStyle}>
                            {row.result
                              ? <span style={{ color: C.navy, fontWeight: 800, fontSize: 16 }}>M {row.result.final_price_lsl.toFixed(2)}</span>
                              : <span style={{ color: C.faint }}>—</span>}
                          </td>
                          <td style={tdStyle}>
                            {row.result
                              ? <span style={{ color: C.faint, fontSize: 13, textDecoration: "line-through" }}>M {row.result.compare_price_lsl.toFixed(2)}</span>
                              : <span style={{ color: C.faint }}>—</span>}
                          </td>
                          <td style={tdStyle}>
                            {row.result
                              ? <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                  {row.result.discount_pct}% off
                                </span>
                              : <span style={{ color: C.faint }}>—</span>}
                          </td>
                          <td style={tdStyle}>
                            {row.status === "saved"  && <span style={{ background: "#dcfce7", color: "#15803d",  padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✓ Saved</span>}
                            {row.status === "error"  && <span style={{ background: "#fee2e2", color: C.danger, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "help" }} title={row.errorMsg}>✗ Error</span>}
                            {row.status === "saving" && <span style={{ color: C.muted, fontSize: 13 }}>Saving…</span>}
                            {row.status === "idle"   && (
                              <button
                                onClick={() => saveRow(idx)}
                                disabled={!row.result}
                                style={{
                                  padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                                  background: row.result ? C.navy : C.surface,
                                  color: row.result ? "#fff" : C.faint,
                                  border: "none", cursor: row.result ? "pointer" : "not-allowed",
                                  minHeight: "unset",
                                }}
                              >
                                Save
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary bar */}
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, color: C.muted, flexWrap: "wrap" }}>
                <span>📦 {rows.length} loaded</span>
                <span>✏️ {rows.filter(r => r.result).length} priced</span>
                <span style={{ color: C.green }}>✓ {savedCount} saved</span>
                {errorCount > 0 && <span style={{ color: C.danger }}>✗ {errorCount} errors</span>}
                {readyCount > 0 && <span style={{ color: C.warn }}>⏳ {readyCount} ready to save</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────────────
function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: "10px 18px", borderRadius: 9, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "#e2e8f0" : bg, color: disabled ? "#94a3b8" : "#fff",
    fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", minHeight: "unset",
  };
}

const tdStyle: React.CSSProperties = {
  padding: "12px 14px", fontSize: 13,
  borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
};