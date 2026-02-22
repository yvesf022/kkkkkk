"use client";

/**
 * FILE: app/admin/pricing/page.tsx
 *
 * Amazon-level Pricing Manager:
 *  - Differentiates priced vs unpriced products with live backend data
 *  - Progress dashboard: % complete, gap analysis, revenue estimate
 *  - Smart filter tabs: All / Unpriced / Priced (with counts)
 *  - Keyboard-native: Tab across rows, Enter to save
 *  - Quick-fill: Apply one INR price to all unpriced products
 *  - Category/brand filter, sort by price/status/name
 *  - Inline editing for already-priced products with change tracking
 *  - Bulk save with parallel execution and per-row status
 *  - Sticky action bar when unsaved changes exist
 *  - Price health indicator (margin too low warning)
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { adminProductsApi, calculatePrice, exchangeApi, pricingApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */

type PricingState = "unpriced" | "priced" | "modified" | "saving" | "saved" | "error";

type BatchRow = {
  product: ProductListItem;
  marketInr: string;
  result: ReturnType<typeof calculatePrice> | null;
  pricingState: PricingState;
  originalPrice: number | null; // Current backend price (0 or null = unpriced)
  isSelected: boolean;
  errorMsg?: string;
  imgErr?: boolean;
};

type SortKey = "default" | "name" | "price_asc" | "price_desc" | "status";
type FilterTab = "all" | "unpriced" | "priced";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════ */
const T = {
  bg:       "#0d1117",
  surface:  "#161b22",
  card:     "#1c2128",
  border:   "#30363d",
  borderL:  "#21262d",
  text:     "#e6edf3",
  muted:    "#8b949e",
  faint:    "#484f58",
  accent:   "#238636",
  accentL:  "#2ea043",
  amber:    "#d29922",
  amberL:   "#e3b341",
  blue:     "#388bfd",
  blueL:    "#79c0ff",
  danger:   "#f85149",
  purple:   "#a371f7",
  cyan:     "#76e3ea",
  white:    "#ffffff",
  // Status
  unpricedBg:  "rgba(210, 153, 34, 0.12)",
  unpricedBdr: "rgba(210, 153, 34, 0.35)",
  pricedBg:    "rgba(35, 134, 54, 0.10)",
  pricedBdr:   "rgba(35, 134, 54, 0.30)",
  modBg:       "rgba(56, 139, 253, 0.10)",
  modBdr:      "rgba(56, 139, 253, 0.30)",
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function isUnpriced(p: ProductListItem): boolean {
  return !p.price || p.price === 0;
}

function marginPct(result: ReturnType<typeof calculatePrice>): number {
  // Margin = profit portion as % of final price
  return parseFloat(((result.profit_inr * result.exchange_rate / result.final_price_lsl) * 100).toFixed(1));
}

function healthColor(result: ReturnType<typeof calculatePrice> | null): string {
  if (!result) return T.faint;
  const m = marginPct(result);
  if (m < 8) return T.danger;
  if (m < 15) return T.amber;
  return T.accentL;
}

/* ═══════════════════════════════════════════════════════════════
   SMALL COMPONENTS
═══════════════════════════════════════════════════════════════ */

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      color, background: bg,
    }}>{children}</span>
  );
}

function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct === 100 ? T.accentL : pct > 60 ? T.blue : T.amber}
        strokeWidth={4} strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: "16px 20px", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? T.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.faint, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */

export default function AdminPricingPage() {

  /* ── Exchange rate ──────────────────────────────────────────── */
  const [rate, setRate]           = useState(0.21);
  const [rateSrc, setRateSrc]     = useState<"live" | "fallback">("fallback");
  const [rateOverride, setOverride] = useState("");
  const [rateLoading, setRateLoading] = useState(true);
  const effectiveRate = rateOverride ? (parseFloat(rateOverride) || rate) : rate;

  useEffect(() => {
    exchangeApi.getINRtoLSL().then(({ rate: r, source }) => {
      setRate(r); setRateSrc(source);
    }).finally(() => setRateLoading(false));
  }, []);

  /* ── Batch state ───────────────────────────────────────────── */
  const [rows, setRows]             = useState<BatchRow[]>([]);
  const [batchLoading, setBatch]    = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [searchQ, setSearchQ]       = useState("");
  const [catFilter, setCatFilter]   = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortKey, setSortKey]       = useState<SortKey>("default");
  const [filterTab, setFilterTab]   = useState<FilterTab>("all");
  const [quickFillInr, setQuickFill] = useState("");
  const [selectAll, setSelectAll]   = useState(false);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [totalLoaded, setTotalLoaded] = useState(0);

  /* ── Quick calculator ──────────────────────────────────────── */
  const [qMarket, setQMarket]       = useState("");
  const qVal    = parseFloat(qMarket) || 0;
  const qResult = qVal > 0 ? calculatePrice({ market_price_inr: qVal, exchange_rate: effectiveRate }) : null;

  /* ── Tab ───────────────────────────────────────────────────── */
  const [tab, setTab] = useState<"calc" | "batch">("batch");

  /* ── Refs for keyboard nav ──────────────────────────────────── */
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  };

  /* ── Derived categories / brands ───────────────────────────── */
  const categories = useMemo(() => [...new Set(rows.map(r => r.product.category).filter(Boolean))].sort(), [rows]);
  const brands     = useMemo(() => [...new Set(rows.map(r => r.product.brand).filter(Boolean))].sort(), [rows]);

  /* ── Load products ─────────────────────────────────────────── */
  const loadProducts = useCallback(async (reset = true) => {
    setBatch(true);
    try {
      const params: Record<string, any> = { per_page: 200, page: 1 };
      if (searchQ)     params.search_query = searchQ;
      if (catFilter)   params.category     = catFilter;
      if (brandFilter) params.brand        = brandFilter;
      const res = await adminProductsApi.list(params);
      const products = res.results ?? [];
      setTotalLoaded(res.total ?? products.length);
      const newRows: BatchRow[] = products.map(p => ({
        product: p,
        marketInr: "",
        result: null,
        pricingState: isUnpriced(p) ? "unpriced" : "priced",
        originalPrice: p.price ?? null,
        isSelected: false,
      }));
      setRows(newRows);
      setSelectAll(false);
      if (!reset) showToast(`Loaded ${products.length} products`, true);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load products", false);
    } finally {
      setBatch(false);
    }
  }, [searchQ, catFilter, brandFilter]);

  /* ── Recalculate all rows when exchange rate changes ─────────── */
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

  /* ── Filtered + sorted rows for display ────────────────────── */
  const displayRows = useMemo(() => {
    let filtered = rows;

    // Filter by tab
    if (filterTab === "unpriced") filtered = filtered.filter(r => r.pricingState === "unpriced" || (r.pricingState === "modified" && !r.originalPrice));
    if (filterTab === "priced")   filtered = filtered.filter(r => r.pricingState === "priced" || r.pricingState === "modified" || r.pricingState === "saved");

    // Sort
    if (sortKey === "name")       filtered = [...filtered].sort((a, b) => a.product.title.localeCompare(b.product.title));
    if (sortKey === "price_asc")  filtered = [...filtered].sort((a, b) => (a.product.price ?? 0) - (b.product.price ?? 0));
    if (sortKey === "price_desc") filtered = [...filtered].sort((a, b) => (b.product.price ?? 0) - (a.product.price ?? 0));
    if (sortKey === "status")     filtered = [...filtered].sort((a, b) => {
      const order: Record<PricingState, number> = { unpriced: 0, modified: 1, priced: 2, saving: 3, saved: 4, error: 5 };
      return order[a.pricingState] - order[b.pricingState];
    });

    return filtered;
  }, [rows, filterTab, sortKey]);

  /* ── Stats ─────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total      = rows.length;
    const unpriced   = rows.filter(r => r.pricingState === "unpriced").length;
    const priced     = rows.filter(r => r.pricingState === "priced" || r.pricingState === "saved").length;
    const modified   = rows.filter(r => r.pricingState === "modified").length;
    const withResult = rows.filter(r => r.result).length;
    const saved      = rows.filter(r => r.pricingState === "saved").length;
    const errors     = rows.filter(r => r.pricingState === "error").length;
    const readyToSave = rows.filter(r => r.result && r.pricingState !== "saved" && r.pricingState !== "saving").length;
    const pctDone    = total > 0 ? Math.round(((priced + saved) / total) * 100) : 0;
    const estimatedRevenue = rows.filter(r => r.result)
      .reduce((sum, r) => sum + (r.result?.final_price_lsl ?? 0), 0);
    return { total, unpriced, priced, modified, withResult, saved, errors, readyToSave, pctDone, estimatedRevenue };
  }, [rows]);

  /* ── Row update ─────────────────────────────────────────────── */
  const updateRow = (idx: number, val: string) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const v = parseFloat(val);
      const result = (!isNaN(v) && v > 0)
        ? calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate })
        : null;
      const newState: PricingState = result
        ? (row.originalPrice && row.originalPrice > 0 ? "modified" : "modified")
        : (row.originalPrice && row.originalPrice > 0 ? "priced" : "unpriced");
      return { ...row, marketInr: val, result, pricingState: newState };
    }));
  };

  const setImgErr = (idx: number) =>
    setRows(prev => prev.map((row, i) => i === idx ? { ...row, imgErr: true } : row));

  /* ── Quick fill all unpriced ────────────────────────────────── */
  const applyQuickFill = () => {
    const v = parseFloat(quickFillInr);
    if (isNaN(v) || v <= 0) return;
    const result = calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate });
    setRows(prev => prev.map(row =>
      row.pricingState === "unpriced"
        ? { ...row, marketInr: quickFillInr, result, pricingState: "modified" }
        : row
    ));
    showToast(`Applied ₹${v.toLocaleString()} to all unpriced products`, true);
  };

  /* ── Select all ─────────────────────────────────────────────── */
  const toggleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setRows(prev => prev.map(row => ({ ...row, isSelected: newVal })));
  };

  const toggleSelectRow = (productId: string) => {
    setRows(prev => prev.map(row =>
      row.product.id === productId ? { ...row, isSelected: !row.isSelected } : row
    ));
  };

  /* ── Save single row ────────────────────────────────────────── */
  const saveRow = async (productId: string) => {
    const rowIdx = rows.findIndex(r => r.product.id === productId);
    if (rowIdx === -1) return;
    const row = rows[rowIdx];
    if (!row.result) return;

    setRows(prev => prev.map(r => r.product.id === productId ? { ...r, pricingState: "saving" } : r));
    try {
      await pricingApi.applyToProduct(productId, row.result.final_price_lsl, row.result.compare_price_lsl);
      setRows(prev => prev.map(r => r.product.id === productId
        ? { ...r, pricingState: "saved", originalPrice: r.result?.final_price_lsl ?? r.originalPrice }
        : r
      ));
    } catch (e: any) {
      setRows(prev => prev.map(r => r.product.id === productId ? { ...r, pricingState: "error", errorMsg: e?.message } : r));
    }
  };

  /* ── Save all / selected ──────────────────────────────────────── */
  const saveAll = async (selectedOnly = false) => {
    const toSave = rows.filter(r =>
      r.result &&
      r.pricingState !== "saved" &&
      r.pricingState !== "saving" &&
      (!selectedOnly || r.isSelected)
    );
    if (!toSave.length) { showToast("No calculated prices to save.", false); return; }
    setBulkSaving(true);

    const items = toSave.map(r => ({
      product_id: r.product.id,
      price_lsl: r.result!.final_price_lsl,
      compare_price_lsl: r.result!.compare_price_lsl,
    }));

    // Mark all as saving
    setRows(prev => prev.map(r =>
      toSave.some(t => t.product.id === r.product.id) ? { ...r, pricingState: "saving" } : r
    ));

    const res = await pricingApi.bulkApply(items);

    // Mark results
    setRows(prev => prev.map(r => {
      const saved = toSave.find(t => t.product.id === r.product.id);
      if (!saved) return r;
      const failed = res.errors.some(e => e.startsWith(r.product.id));
      return {
        ...r,
        pricingState: failed ? "error" : "saved",
        originalPrice: failed ? r.originalPrice : (r.result?.final_price_lsl ?? r.originalPrice),
      };
    }));

    setBulkSaving(false);
    showToast(`✓ ${res.success} saved${res.failed ? `, ${res.failed} failed` : ""}`, res.failed === 0);
  };

  /* ── Keyboard navigation ────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent, currentIdx: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      // Find next unfilled row
      const displayIds = displayRows.map(r => r.product.id);
      const currentPos = displayIds.indexOf(rows[currentIdx]?.product.id);
      const next = displayIds[currentPos + 1];
      if (next) {
        const nextIdx = rows.findIndex(r => r.product.id === next);
        inputRefs.current.get(nextIdx)?.focus();
      }
    }
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div style={{
      maxWidth: 1400, fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      background: T.bg, minHeight: "100vh", padding: "0 0 80px",
    }}>

      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.faint}; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }

        .row-hover:hover { background: rgba(255,255,255,0.025) !important; }
        .btn-primary {
          padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer;
          background: ${T.accentL}; color: #fff; font-size: 13px; font-weight: 700;
          font-family: inherit; transition: all 0.15s; white-space: nowrap;
        }
        .btn-primary:hover:not(:disabled) { background: #3fb950; transform: translateY(-1px); }
        .btn-primary:disabled { background: ${T.border}; color: ${T.faint}; cursor: not-allowed; transform: none; }

        .btn-ghost {
          padding: 8px 14px; border-radius: 8px; border: 1px solid ${T.border};
          cursor: pointer; background: transparent; color: ${T.muted}; font-size: 13px;
          font-weight: 600; font-family: inherit; transition: all 0.15s;
        }
        .btn-ghost:hover:not(:disabled) { background: ${T.card}; color: ${T.text}; border-color: ${T.faint}; }

        .input-std {
          padding: 8px 12px; border-radius: 8px; border: 1px solid ${T.border};
          background: ${T.surface}; color: ${T.text}; font-size: 13px;
          font-family: inherit; outline: none; transition: border-color 0.15s;
        }
        .input-std:focus { border-color: ${T.blue}; box-shadow: 0 0 0 3px rgba(56,139,253,0.15); }
        .input-std::placeholder { color: ${T.faint}; }

        .input-inr {
          padding: 7px 10px; border-radius: 7px; border: 1px solid ${T.border};
          background: ${T.surface}; color: ${T.text}; font-size: 14px; font-weight: 600;
          font-family: inherit; outline: none; width: 120px; transition: border-color 0.15s;
        }
        .input-inr:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(210,153,34,0.2); }
        .input-inr::placeholder { color: ${T.faint}; font-weight: 400; }

        .tab-btn {
          padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 700;
          border: 1px solid transparent; cursor: pointer; transition: all 0.15s;
          font-family: inherit; display: flex; align-items: center; gap: 7px;
        }
        .tab-btn.active {
          background: ${T.card}; border-color: ${T.border}; color: ${T.text};
        }
        .tab-btn.inactive {
          background: transparent; color: ${T.muted};
        }
        .tab-btn.inactive:hover { color: ${T.text}; background: rgba(255,255,255,0.04); }

        .filter-tab {
          padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700;
          border: 1px solid transparent; cursor: pointer; transition: all 0.15s;
          font-family: inherit; display: inline-flex; align-items: center; gap: 6px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease; }
        .slide-up { animation: slideUp 0.3s ease; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className="fade-in" style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? "#238636" : "#da3633",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontWeight: 700, fontSize: 13, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          border: `1px solid ${toast.ok ? "#2ea04380" : "#f8514980"}`,
          display: "flex", alignItems: "center", gap: 8, maxWidth: 400,
        }}>
          <span style={{ fontSize: 16 }}>{toast.ok ? "✓" : "✗"}</span>
          {toast.msg}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Link href="/admin" style={{ fontSize: 12, color: T.muted, textDecoration: "none" }}>
              ← Dashboard
            </Link>
            <span style={{ color: T.faint }}>/</span>
            <span style={{ fontSize: 12, color: T.muted }}>Pricing Manager</span>
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 800, margin: 0, color: T.text,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{
              background: "linear-gradient(135deg, #f0c040, #e3b341)",
              borderRadius: 8, width: 34, height: 34, display: "inline-flex",
              alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>₹</span>
            Pricing Manager
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: T.faint }}>
            INR → LSL (M) · Formula: (Market + ₹700 shipping + ₹500 profit) × exchange rate
          </p>
        </div>

        {/* Exchange rate widget */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
          padding: "12px 18px", minWidth: 270,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: rateLoading ? T.faint : rateSrc === "live" ? T.accentL : T.amber,
              boxShadow: rateLoading ? "none" : `0 0 6px ${rateSrc === "live" ? T.accentL : T.amber}`,
            }} />
            {rateLoading ? (
              <span style={{ color: T.muted }}>Fetching rate…</span>
            ) : (
              <span style={{ color: T.muted }}>
                <strong style={{ color: rateSrc === "live" ? T.accentL : T.amber }}>
                  {rateSrc === "live" ? "LIVE" : "FALLBACK"}
                </strong>
                {" "}1 ₹ = M {effectiveRate.toFixed(5)}
              </span>
            )}
            {rateOverride && <span style={{ marginLeft: "auto", color: T.purple, fontSize: 10, fontWeight: 700 }}>OVERRIDE</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="number" placeholder="Override rate…" value={rateOverride}
              onChange={e => setOverride(e.target.value)} step="0.0001"
              className="input-std" style={{ flex: 1, fontSize: 12 }}
            />
            {rateOverride && (
              <button onClick={() => setOverride("")} className="btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* ── Main tabs ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[
            { id: "batch", label: "Batch Pricing", icon: "⚡" },
            { id: "calc",  label: "Calculator",    icon: "🧮" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`tab-btn ${tab === t.id ? "active" : "inactive"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            QUICK CALCULATOR TAB
        ══════════════════════════════════════════════════════ */}
        {tab === "calc" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 840 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>
                Enter Indian Market Price
              </div>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Market Price (₹) *
                </label>
              </div>
              <input
                type="number" value={qMarket}
                onChange={e => setQMarket(e.target.value)}
                placeholder="e.g. 2499" autoFocus
                className="input-std"
                style={{ width: "100%", fontSize: 28, fontWeight: 800, padding: "16px 18px", border: `2px solid ${T.amber}` }}
              />
              <div style={{
                marginTop: 18, padding: "14px 16px",
                background: T.surface, borderRadius: 10, border: `1px solid ${T.borderL}`,
              }}>
                {[
                  ["🚚 Shipping", "₹700"],
                  ["💼 Company Profit", "₹500"],
                  ["💱 Exchange Rate", `M ${effectiveRate.toFixed(5)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
                    <span style={{ color: T.muted }}>{k}</span>
                    <span style={{ fontWeight: 700, color: T.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28 }}>
              {qResult ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>Breakdown</div>
                  {[
                    ["Market Price", `₹ ${qVal.toLocaleString()}`],
                    ["+ Shipping",   `₹ ${qResult.shipping_cost_inr.toLocaleString()}`],
                    ["+ Profit",     `₹ ${qResult.profit_inr.toLocaleString()}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.borderL}`, fontSize: 13 }}>
                      <span style={{ color: T.muted }}>{k}</span>
                      <span style={{ fontWeight: 700, color: T.text }}>{v}</span>
                    </div>
                  ))}
                  <div style={{
                    marginTop: 18, background: "linear-gradient(135deg, #0d1117, #1a2e1a)",
                    border: `1px solid ${T.accentL}40`, borderRadius: 12,
                    padding: "22px 20px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 11, color: T.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
                      FINAL PRICE (MALOTI)
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: T.accentL, letterSpacing: -2 }}>
                      M {qResult.final_price_lsl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: T.faint, marginTop: 6, textDecoration: "line-through" }}>
                      M {qResult.compare_price_lsl.toFixed(2)}
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      marginTop: 10, background: `${T.accentL}20`, border: `1px solid ${T.accentL}40`,
                      padding: "4px 12px", borderRadius: 20, fontSize: 12,
                    }}>
                      <span style={{ color: T.accentL, fontWeight: 700 }}>{qResult.discount_pct}% off</span>
                      <span style={{ color: T.muted }}>· Customer saves M {qResult.savings_lsl.toFixed(2)}</span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: healthColor(qResult) }}>
                      Margin: {marginPct(qResult)}%
                      {marginPct(qResult) < 8 && " ⚠ Too low"}
                      {marginPct(qResult) >= 8 && marginPct(qResult) < 15 && " — Acceptable"}
                      {marginPct(qResult) >= 15 && " ✓ Healthy"}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 240, color: T.faint, textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12, filter: "grayscale(1)" }}>🧮</div>
                  <p style={{ fontSize: 13 }}>Enter an Indian market price to calculate the Maloti selling price.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            BATCH PRICING TAB
        ══════════════════════════════════════════════════════ */}
        {tab === "batch" && (
          <div>

            {/* Dashboard stats (shown when rows are loaded) */}
            {rows.length > 0 && (
              <div className="slide-up" style={{ marginBottom: 24 }}>

                {/* Progress bar */}
                <div style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 14, padding: "20px 24px", marginBottom: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                      <ProgressRing pct={stats.pctDone} size={56} />
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 11, fontWeight: 800, color: T.text,
                      }}>
                        {stats.pctDone}%
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                        <span style={{ color: T.muted, fontWeight: 600 }}>Pricing Progress</span>
                        <span style={{ color: T.text, fontWeight: 700 }}>
                          {stats.priced + stats.saved} / {stats.total} products priced
                        </span>
                      </div>
                      <div style={{ background: T.border, borderRadius: 20, height: 8, overflow: "hidden" }}>
                        <div style={{
                          width: `${stats.pctDone}%`, height: "100%", borderRadius: 20,
                          background: stats.pctDone === 100
                            ? `linear-gradient(90deg, ${T.accentL}, #56d364)`
                            : stats.pctDone > 60
                            ? `linear-gradient(90deg, ${T.blue}, #79c0ff)`
                            : `linear-gradient(90deg, ${T.amber}, #e3b341)`,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, flexWrap: "wrap" }}>
                        <span style={{ color: T.amberL }}>◆ {stats.unpriced} unpriced</span>
                        <span style={{ color: T.accentL }}>◆ {stats.priced + stats.saved} priced</span>
                        {stats.modified > 0 && <span style={{ color: T.blueL }}>◆ {stats.modified} modified</span>}
                        {stats.errors > 0 && <span style={{ color: T.danger }}>◆ {stats.errors} errors</span>}
                        <span style={{ marginLeft: "auto", color: T.muted }}>
                          {totalLoaded > rows.length ? `Showing ${rows.length} of ${totalLoaded}` : `${rows.length} loaded`}
                        </span>
                      </div>
                    </div>

                    {stats.estimatedRevenue > 0 && (
                      <div style={{ textAlign: "right", borderLeft: `1px solid ${T.border}`, paddingLeft: 20 }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                          Priced Inventory Est.
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: T.accentL }}>
                          M {stats.estimatedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stat cards */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard label="Total Products"  value={stats.total} />
                  <StatCard label="Unpriced"        value={stats.unpriced}           accent={stats.unpriced > 0 ? T.amberL : T.muted} sub={stats.unpriced > 0 ? "Need pricing" : "All priced!"} />
                  <StatCard label="Priced"          value={stats.priced + stats.saved} accent={T.accentL} />
                  <StatCard label="Ready to Save"   value={stats.readyToSave}          accent={stats.readyToSave > 0 ? T.blueL : T.muted} sub={stats.readyToSave > 0 ? "Tap Save All" : "—"} />
                  {stats.errors > 0 && <StatCard label="Errors" value={stats.errors} accent={T.danger} sub="Click to retry" />}
                </div>
              </div>
            )}

            {/* ── Toolbar ── */}
            <div style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
              padding: "14px 16px", marginBottom: 16,
            }}>

              {/* Row 1: Load controls */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <input
                  type="text" value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadProducts()}
                  placeholder="Search products…"
                  className="input-std" style={{ flex: 1, maxWidth: 280 }}
                />
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  className="input-std" style={{ minWidth: 160 }}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c!}>{c}</option>)}
                </select>
                <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
                  className="input-std" style={{ minWidth: 140 }}>
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b} value={b!}>{b}</option>)}
                </select>
                <button
                  onClick={() => loadProducts()}
                  disabled={batchLoading}
                  className="btn-primary"
                  style={{ background: T.blue, minWidth: 130 }}
                >
                  {batchLoading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Loading…
                    </span>
                  ) : rows.length > 0 ? "🔄 Reload" : "⚡ Load Products"}
                </button>
              </div>

              {/* Row 2: Actions (shown after load) */}
              {rows.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

                  {/* Quick fill unpriced */}
                  {stats.unpriced > 0 && (
                    <div style={{
                      display: "flex", gap: 6, alignItems: "center",
                      background: `${T.amber}15`, border: `1px solid ${T.unpricedBdr}`,
                      borderRadius: 8, padding: "6px 10px",
                    }}>
                      <span style={{ fontSize: 11, color: T.amberL, fontWeight: 700, whiteSpace: "nowrap" }}>
                        Quick Fill ({stats.unpriced} unpriced):
                      </span>
                      <input
                        type="number" value={quickFillInr}
                        onChange={e => setQuickFill(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && applyQuickFill()}
                        placeholder="₹ price"
                        className="input-inr" style={{ width: 100 }}
                      />
                      <button
                        onClick={applyQuickFill}
                        disabled={!quickFillInr}
                        className="btn-primary"
                        style={{ background: T.amber, fontSize: 12, padding: "7px 12px" }}
                      >
                        Apply to All
                      </button>
                    </div>
                  )}

                  {/* Sort */}
                  <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                    className="input-std" style={{ fontSize: 12 }}>
                    <option value="default">Sort: Default</option>
                    <option value="status">Sort: Unpriced First</option>
                    <option value="name">Sort: Name A–Z</option>
                    <option value="price_asc">Sort: Price ↑</option>
                    <option value="price_desc">Sort: Price ↓</option>
                  </select>

                  {/* Save actions */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    {rows.filter(r => r.isSelected && r.result).length > 0 && (
                      <button
                        onClick={() => saveAll(true)}
                        disabled={bulkSaving}
                        className="btn-primary"
                        style={{ background: T.blue }}
                      >
                        💾 Save Selected ({rows.filter(r => r.isSelected && r.result).length})
                      </button>
                    )}
                    <button
                      onClick={() => saveAll(false)}
                      disabled={bulkSaving || stats.readyToSave === 0}
                      className="btn-primary"
                    >
                      {bulkSaving ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          Saving…
                        </span>
                      ) : `💾 Save All (${stats.readyToSave})`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Filter tabs ── */}
            {rows.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[
                  { id: "all",      label: "All",      count: rows.length },
                  { id: "unpriced", label: "Unpriced", count: stats.unpriced },
                  { id: "priced",   label: "Priced",   count: stats.priced + stats.saved },
                ].map(t => (
                  <button key={t.id}
                    onClick={() => setFilterTab(t.id as FilterTab)}
                    className="filter-tab"
                    style={{
                      background: filterTab === t.id
                        ? (t.id === "unpriced" ? T.unpricedBg : t.id === "priced" ? T.pricedBg : T.card)
                        : "transparent",
                      border: filterTab === t.id
                        ? `1px solid ${t.id === "unpriced" ? T.unpricedBdr : t.id === "priced" ? T.pricedBdr : T.border}`
                        : `1px solid ${T.borderL}`,
                      color: filterTab === t.id
                        ? (t.id === "unpriced" ? T.amberL : t.id === "priced" ? T.accentL : T.text)
                        : T.muted,
                    }}
                  >
                    {t.id === "unpriced" && "⚠ "}
                    {t.id === "priced" && "✓ "}
                    {t.label}
                    <span style={{
                      background: filterTab === t.id ? "rgba(255,255,255,0.15)" : T.surface,
                      padding: "1px 6px", borderRadius: 10, fontSize: 11,
                    }}>
                      {t.count}
                    </span>
                  </button>
                ))}

                <span style={{ marginLeft: 10, fontSize: 12, color: T.faint, alignSelf: "center" }}>
                  Showing {displayRows.length} products
                </span>
              </div>
            )}

            {/* ── Empty state ── */}
            {rows.length === 0 && !batchLoading && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "80px 0", color: T.faint, gap: 14,
                background: T.card, borderRadius: 14, border: `1px dashed ${T.border}`,
              }}>
                <div style={{ fontSize: 52, filter: "grayscale(0.5)" }}>⚡</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.muted }}>Ready to price your products</div>
                <p style={{ fontSize: 13, margin: 0, maxWidth: 360, textAlign: "center" }}>
                  Click "Load Products" to fetch your catalog. Unpriced items will be highlighted so you can action them fast.
                </p>
                <button onClick={() => loadProducts()} className="btn-primary" style={{ marginTop: 8 }}>
                  ⚡ Load Products
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {batchLoading && rows.length === 0 && (
              <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{
                    padding: "16px 20px", borderBottom: `1px solid ${T.borderL}`,
                    display: "flex", gap: 16, alignItems: "center",
                    opacity: 1 - (i * 0.08),
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: 8, background: T.surface }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: `${40 + i * 7}%`, height: 12, borderRadius: 4, background: T.surface, marginBottom: 8 }} />
                      <div style={{ width: "25%", height: 10, borderRadius: 4, background: T.surface }} />
                    </div>
                    <div style={{ width: 100, height: 32, borderRadius: 8, background: T.surface }} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Product table ── */}
            {displayRows.length > 0 && (
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
                    <thead>
                      <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                        <th style={{ ...TH, width: 36 }}>
                          <input
                            type="checkbox" checked={selectAll} onChange={toggleSelectAll}
                            style={{ accentColor: T.blue, width: 14, height: 14, cursor: "pointer" }}
                          />
                        </th>
                        <th style={{ ...TH, textAlign: "left", minWidth: 280 }}>Product</th>
                        <th style={{ ...TH, textAlign: "left" }}>Status</th>
                        <th style={{ ...TH, textAlign: "right" }}>Current Price</th>
                        <th style={{ ...TH, textAlign: "center", minWidth: 130 }}>Market Price (₹)</th>
                        <th style={{ ...TH, textAlign: "right" }}>Cost (₹)</th>
                        <th style={{ ...TH, textAlign: "right", minWidth: 120 }}>Final (M)</th>
                        <th style={{ ...TH, textAlign: "right" }}>Compare (M)</th>
                        <th style={{ ...TH, textAlign: "center" }}>Margin</th>
                        <th style={{ ...TH, textAlign: "center" }}>Disc%</th>
                        <th style={{ ...TH, textAlign: "center", minWidth: 90 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row) => {
                        const globalIdx = rows.findIndex(r => r.product.id === row.product.id);
                        const { pricingState } = row;
                        const isUp = pricingState === "unpriced";
                        const isMod = pricingState === "modified";
                        const isErr = pricingState === "error";
                        const isSaved = pricingState === "saved";
                        const isPriced = pricingState === "priced";

                        const rowBg = isErr   ? "rgba(248,81,73,0.07)"
                                    : isSaved  ? "rgba(35,134,54,0.08)"
                                    : isMod    ? "rgba(56,139,253,0.06)"
                                    : isUp     ? "rgba(210,153,34,0.06)"
                                    : "transparent";

                        const leftBorderColor = isErr   ? T.danger
                                              : isSaved  ? T.accentL
                                              : isMod    ? T.blue
                                              : isUp     ? T.amber
                                              : "transparent";

                        return (
                          <tr key={row.product.id} className="row-hover"
                            style={{ background: rowBg, transition: "background 0.2s", borderBottom: `1px solid ${T.borderL}` }}>

                            {/* Left border indicator */}
                            <td style={{ padding: 0, width: 0 }}>
                              <div style={{ width: 3, minHeight: 72, background: leftBorderColor, transition: "background 0.2s" }} />
                            </td>

                            {/* Checkbox */}
                            <td style={{ ...TD, width: 36, paddingLeft: 16 }}>
                              <input
                                type="checkbox" checked={row.isSelected}
                                onChange={() => toggleSelectRow(row.product.id)}
                                style={{ accentColor: T.blue, width: 14, height: 14, cursor: "pointer" }}
                              />
                            </td>

                            {/* Product */}
                            <td style={{ ...TD, minWidth: 260 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{
                                  width: 52, height: 52, flexShrink: 0, borderRadius: 8,
                                  overflow: "hidden", border: `1px solid ${T.border}`,
                                  background: T.surface, display: "flex",
                                  alignItems: "center", justifyContent: "center",
                                }}>
                                  {(row.product as any).main_image && !row.imgErr ? (
                                    <img
                                      src={(row.product as any).main_image}
                                      alt={row.product.title}
                                      onError={() => setImgErr(globalIdx)}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                      stroke={T.faint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                                      <circle cx="8.5" cy="8.5" r="1.5"/>
                                      <path d="M21 15l-5-5L5 21"/>
                                    </svg>
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{
                                    fontWeight: 700, fontSize: 13, color: T.text,
                                    maxWidth: 220, overflow: "hidden",
                                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                                    lineHeight: 1.35,
                                  }}>
                                    {row.product.title}
                                  </div>
                                  <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>
                                    {[row.product.brand, row.product.category].filter(Boolean).join(" · ") || "—"}
                                  </div>
                                  {row.product.sku && (
                                    <div style={{ fontSize: 10, color: T.faint, marginTop: 2, fontFamily: "monospace" }}>
                                      SKU: {row.product.sku}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Status badge */}
                            <td style={TD}>
                              {isUp && <Badge color={T.amberL} bg={T.unpricedBg}>⚠ Unpriced</Badge>}
                              {isPriced && <Badge color={T.accentL} bg={T.pricedBg}>✓ Priced</Badge>}
                              {isMod && <Badge color={T.blueL} bg={T.modBg}>✏ Modified</Badge>}
                              {pricingState === "saving" && <Badge color={T.muted} bg={T.surface}>⟳ Saving</Badge>}
                              {isSaved && <Badge color={T.accentL} bg={T.pricedBg}>✓ Saved</Badge>}
                              {isErr && <Badge color={T.danger} bg="rgba(248,81,73,0.12)">✗ Error</Badge>}
                            </td>

                            {/* Current price */}
                            <td style={{ ...TD, textAlign: "right" }}>
                              {row.originalPrice && row.originalPrice > 0 ? (
                                <span style={{ fontWeight: 700, fontSize: 13, color: isPriced || isSaved ? T.accentL : T.muted }}>
                                  M {row.originalPrice.toFixed(2)}
                                </span>
                              ) : (
                                <span style={{ color: T.faint, fontSize: 12 }}>—</span>
                              )}
                            </td>

                            {/* Market price input */}
                            <td style={{ ...TD, textAlign: "center" }}>
                              <input
                                ref={el => {
                                  if (el) inputRefs.current.set(globalIdx, el);
                                  else inputRefs.current.delete(globalIdx);
                                }}
                                type="number"
                                value={row.marketInr}
                                onChange={e => updateRow(globalIdx, e.target.value)}
                                onKeyDown={e => handleKeyDown(e, globalIdx)}
                                placeholder="₹ price"
                                disabled={pricingState === "saving"}
                                className="input-inr"
                                style={{
                                  borderColor: row.result ? T.amber : T.border,
                                  opacity: pricingState === "saving" ? 0.5 : 1,
                                }}
                              />
                            </td>

                            {/* Total cost INR */}
                            <td style={{ ...TD, textAlign: "right" }}>
                              {row.result ? (
                                <span style={{ color: T.muted, fontSize: 12 }}>
                                  ₹{row.result.total_cost_inr.toLocaleString()}
                                </span>
                              ) : <span style={{ color: T.faint }}>—</span>}
                            </td>

                            {/* Final price LSL */}
                            <td style={{ ...TD, textAlign: "right" }}>
                              {row.result ? (
                                <span style={{ fontWeight: 800, fontSize: 15, color: T.accentL }}>
                                  M {row.result.final_price_lsl.toFixed(2)}
                                </span>
                              ) : <span style={{ color: T.faint }}>—</span>}
                            </td>

                            {/* Compare price */}
                            <td style={{ ...TD, textAlign: "right" }}>
                              {row.result ? (
                                <span style={{ color: T.faint, fontSize: 12, textDecoration: "line-through" }}>
                                  M {row.result.compare_price_lsl.toFixed(2)}
                                </span>
                              ) : <span style={{ color: T.faint }}>—</span>}
                            </td>

                            {/* Margin health */}
                            <td style={{ ...TD, textAlign: "center" }}>
                              {row.result ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                  <span style={{
                                    fontWeight: 800, fontSize: 13,
                                    color: healthColor(row.result),
                                  }}>
                                    {marginPct(row.result)}%
                                  </span>
                                  <div style={{
                                    width: 32, height: 4, borderRadius: 2,
                                    background: T.border, overflow: "hidden",
                                  }}>
                                    <div style={{
                                      height: "100%",
                                      width: `${Math.min(marginPct(row.result) / 30 * 100, 100)}%`,
                                      background: healthColor(row.result),
                                      transition: "width 0.3s ease",
                                    }} />
                                  </div>
                                </div>
                              ) : <span style={{ color: T.faint }}>—</span>}
                            </td>

                            {/* Discount % */}
                            <td style={{ ...TD, textAlign: "center" }}>
                              {row.result ? (
                                <Badge color={T.accentL} bg={T.pricedBg}>
                                  {row.result.discount_pct}%
                                </Badge>
                              ) : <span style={{ color: T.faint }}>—</span>}
                            </td>

                            {/* Action */}
                            <td style={{ ...TD, textAlign: "center" }}>
                              {pricingState === "saving" && (
                                <span style={{ display: "inline-block", width: 16, height: 16, border: `2px solid ${T.border}`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                              )}
                              {pricingState === "error" && (
                                <button
                                  onClick={() => saveRow(row.product.id)}
                                  title={row.errorMsg}
                                  style={{
                                    padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.danger}40`,
                                    background: "rgba(248,81,73,0.12)", color: T.danger,
                                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                                  }}
                                >
                                  Retry
                                </button>
                              )}
                              {(pricingState === "idle" as any || pricingState === "unpriced" || pricingState === "priced" || pricingState === "modified") && (
                                <button
                                  onClick={() => saveRow(row.product.id)}
                                  disabled={!row.result}
                                  style={{
                                    padding: "5px 12px", borderRadius: 6, border: "none",
                                    background: row.result ? T.accentL : T.border,
                                    color: row.result ? "#fff" : T.faint,
                                    fontSize: 12, fontWeight: 700,
                                    cursor: row.result ? "pointer" : "not-allowed",
                                    fontFamily: "inherit", transition: "all 0.15s",
                                  }}
                                >
                                  Save
                                </button>
                              )}
                              {isSaved && (
                                <span style={{ fontSize: 16 }}>✓</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table footer */}
                <div style={{
                  padding: "12px 20px", borderTop: `1px solid ${T.border}`,
                  display: "flex", gap: 16, fontSize: 12, color: T.muted, flexWrap: "wrap",
                  alignItems: "center", background: T.surface,
                }}>
                  <span>📦 {rows.length} products loaded</span>
                  <span>✏️ {rows.filter(r => r.result).length} with INR prices</span>
                  <span style={{ color: T.amberL }}>⚠ {stats.unpriced} unpriced</span>
                  <span style={{ color: T.accentL }}>✓ {stats.priced + stats.saved} priced</span>
                  {stats.errors > 0 && <span style={{ color: T.danger }}>✗ {stats.errors} errors</span>}
                  {stats.readyToSave > 0 && (
                    <span style={{ marginLeft: "auto", color: T.blueL, fontWeight: 700 }}>
                      ⏳ {stats.readyToSave} ready to save — hit "Save All"
                    </span>
                  )}
                  <span style={{ color: T.faint, fontSize: 11 }}>
                    Tip: Press Tab or Enter to jump between price inputs
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky save bar (floats when there are unsaved changes) ── */}
      {stats.readyToSave > 0 && (
        <div className="slide-up" style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#0d1117", border: `1px solid ${T.accentL}50`,
          borderRadius: 14, padding: "14px 24px",
          display: "flex", alignItems: "center", gap: 20,
          boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${T.accentL}20`,
          zIndex: 1000, backdropFilter: "blur(8px)",
          minWidth: 420,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>
              {stats.readyToSave} price{stats.readyToSave !== 1 ? "s" : ""} ready to save
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              Changes won't apply until you save
            </div>
          </div>
          <button
            onClick={() => saveAll(false)}
            disabled={bulkSaving}
            className="btn-primary"
            style={{ minWidth: 140, padding: "10px 24px", fontSize: 14 }}
          >
            {bulkSaving ? "Saving…" : `💾 Save All (${stats.readyToSave})`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLE CONSTANTS
═══════════════════════════════════════════════════════════════ */
const TH: React.CSSProperties = {
  padding: "11px 14px", fontSize: 11, fontWeight: 700,
  color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.6px",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "13px 14px", fontSize: 13, verticalAlign: "middle",
};