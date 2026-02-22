"use client";

/**
 * FILE: app/admin/pricing/page.tsx
 * 🔥 BEAST MODE — Karabo Pricing Manager
 *
 * RULES:
 *  ✦ A product is only "Priced" if the admin has priced it through THIS tool,
 *    OR if the admin manually marks it as priced.
 *  ✦ Products with existing DB prices are still treated as "Unpriced" in this
 *    tool until the admin takes action here — the tool never assumes.
 *  ✦ Priced state is stored in localStorage per session (key: karabo_pricing_v1)
 *    so refreshing doesn't lose track of what was priced this session.
 *  ✦ Admin can manually mark any product as "Priced" without re-entering a price.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { adminProductsApi, calculatePrice, exchangeApi, pricingApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */

/**
 * PricingState rules:
 * - "unpriced"  → product has NOT been priced through this tool (default for ALL products)
 * - "priced"    → priced via this tool OR manually marked by admin
 * - "modified"  → has a calculated result not yet saved
 * - "saving"    → API call in progress
 * - "saved"     → successfully saved this session (transitions to "priced")
 * - "error"     → save failed
 */
type PricingState = "unpriced" | "priced" | "modified" | "saving" | "saved" | "error";

type BatchRow = {
  product: ProductListItem;
  marketInr: string;
  result: ReturnType<typeof calculatePrice> | null;
  state: PricingState;
  /** The price that was set through THIS tool (null if never priced here) */
  toolPrice: number | null;
  isSelected: boolean;
  errorMsg?: string;
  imgErr?: boolean;
};

type SortKey = "default" | "name" | "price_asc" | "price_desc" | "unpriced_first";
type FilterTab = "all" | "unpriced" | "priced";
type MainTab = "batch" | "calc";

/* ═══════════════════════════════════════════════════
   LOCAL STORAGE — track which products were priced
   through this tool (persists across page refreshes)
═══════════════════════════════════════════════════ */

const STORAGE_KEY = "karabo_pricing_v1";

function loadPricedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}

function savePricedId(id: string) {
  try {
    const ids = loadPricedIds();
    ids.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

function removePricedId(id: string) {
  try {
    const ids = loadPricedIds();
    ids.delete(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */

const marginPct = (r: ReturnType<typeof calculatePrice>) =>
  parseFloat(((r.profit_inr * r.exchange_rate / r.final_price_lsl) * 100).toFixed(1));

const marginColor = (r: ReturnType<typeof calculatePrice> | null): string => {
  if (!r) return "var(--gray-300)";
  const m = marginPct(r);
  if (m < 8) return "#dc2626";
  if (m < 15) return "#d97706";
  return "var(--primary)";
};

const fmt = (n: number, dec = 2) => n.toFixed(dec);

/* ═══════════════════════════════════════════════════
   SMALL COMPONENTS
═══════════════════════════════════════════════════ */

function PricingBadge({ state }: { state: PricingState }) {
  const map: Record<PricingState, { label: string; bg: string; color: string; dot: string }> = {
    unpriced: { label: "Unpriced",  bg: "#fef3c7", color: "#92400e",           dot: "#d97706" },
    priced:   { label: "Priced",    bg: "#dcfce7", color: "#14532d",           dot: "var(--primary)" },
    modified: { label: "Modified",  bg: "#dbeafe", color: "#1e3a8a",           dot: "#2563eb" },
    saving:   { label: "Saving…",   bg: "var(--gray-100)", color: "var(--gray-600)", dot: "var(--gray-400)" },
    saved:    { label: "✓ Saved",   bg: "#dcfce7", color: "#14532d",           dot: "var(--primary)" },
    error:    { label: "Error",     bg: "#fee2e2", color: "#991b1b",           dot: "#dc2626" },
  };
  const s = map[state];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function ProgressArc({ pct }: { pct: number }) {
  const size = 60, r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? "var(--primary)" : pct > 60 ? "var(--accent)" : "#d97706";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--gray-200)" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: "var(--gray-900)", lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 8, color: "var(--gray-400)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>done</span>
      </div>
    </div>
  );
}

function StatPill({ label, value, sub, accent, icon }: {
  label: string; value: string | number; sub?: string; accent?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "white", borderRadius: "var(--radius-md)",
      border: "1px solid var(--gray-200)", padding: "10px 14px",
      flex: 1, minWidth: 110, boxShadow: "var(--shadow-soft)",
      borderLeft: accent ? `4px solid ${accent}` : "1px solid var(--gray-200)",
    }}>
      <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent ?? "var(--gray-900)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */

export default function AdminPricingPage() {

  /* ── Exchange rate ── */
  const [rate, setRate]               = useState(0.21);
  const [rateSrc, setRateSrc]         = useState<"live" | "fallback">("fallback");
  const [rateOverride, setOverride]   = useState("");
  const [rateLoading, setRateLoading] = useState(true);
  const effectiveRate = rateOverride ? (parseFloat(rateOverride) || rate) : rate;

  useEffect(() => {
    exchangeApi.getINRtoLSL()
      .then(({ rate: r, source }) => { setRate(r); setRateSrc(source); })
      .finally(() => setRateLoading(false));
  }, []);

  /* ── State ── */
  const [rows, setRows]               = useState<BatchRow[]>([]);
  const [batchLoading, setBatch]      = useState(false);
  const [bulkSaving, setBulkSaving]   = useState(false);
  const [searchQ, setSearchQ]         = useState("");
  const [catFilter, setCat]           = useState("");
  const [brandFilter, setBrand]       = useState("");
  const [sortKey, setSort]            = useState<SortKey>("unpriced_first");
  const [filterTab, setFilterTab]     = useState<FilterTab>("all");
  const [quickFillInr, setFill]       = useState("");
  const [selectAll, setSelectAll]     = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [totalCount, setTotal]        = useState(0);
  const [mainTab, setMainTab]         = useState<MainTab>("batch");
  const [qMarket, setQMarket]         = useState("");
  const [showFormula, setShowFormula] = useState(false);
  const [highlightUnpriced, setHL]    = useState(true);

  const qVal    = parseFloat(qMarket) || 0;
  const qResult = qVal > 0 ? calculatePrice({ market_price_inr: qVal, exchange_rate: effectiveRate }) : null;
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4500);
  }, []);

  /* ── Derived ── */
  const categories = useMemo(() =>
    [...new Set(rows.map(r => r.product.category).filter(Boolean))].sort() as string[], [rows]);
  const brands = useMemo(() =>
    [...new Set(rows.map(r => r.product.brand).filter(Boolean))].sort() as string[], [rows]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total         = rows.length;
    const unpriced      = rows.filter(r => r.state === "unpriced").length;
    const priced        = rows.filter(r => r.state === "priced" || r.state === "saved").length;
    const modified      = rows.filter(r => r.state === "modified").length;
    const errors        = rows.filter(r => r.state === "error").length;
    const withResult    = rows.filter(r => r.result).length;
    const readyToSave   = rows.filter(r => r.result && r.state !== "saved" && r.state !== "saving" && r.state !== "priced").length;
    const pctDone       = total > 0 ? Math.round((priced / total) * 100) : 0;
    const selectedReady = rows.filter(r => r.isSelected && r.result && r.state !== "saved" && r.state !== "priced").length;
    const estRevenue    = rows.filter(r => r.result).reduce((s, r) => s + (r.result?.final_price_lsl ?? 0), 0);
    return { total, unpriced, priced, modified, errors, withResult, readyToSave, pctDone, selectedReady, estRevenue };
  }, [rows]);

  /* ── Load products ──
     KEY CHANGE: ALL products load as "unpriced" unless they exist
     in our localStorage set (meaning admin priced them via this tool
     in a previous session). DB price is displayed but never used to
     determine pricing state.
  ── */
  const loadProducts = useCallback(async () => {
    setBatch(true);
    try {
      const params: Record<string, any> = { per_page: 200, page: 1 };
      if (searchQ)     params.search_query = searchQ;
      if (catFilter)   params.category     = catFilter;
      if (brandFilter) params.brand        = brandFilter;
      const res = await adminProductsApi.list(params);
      const products = res.results ?? [];
      setTotal(res.total ?? products.length);

      // Load the set of IDs that were priced through this tool
      const pricedViaToolIds = loadPricedIds();

      setRows(products.map(p => ({
        product: p,
        marketInr: "",
        result: null,
        // Only "priced" if admin priced it via this tool (localStorage) — never assume from DB
        state: pricedViaToolIds.has(p.id) ? "priced" : "unpriced",
        toolPrice: pricedViaToolIds.has(p.id) ? (p.price ?? null) : null,
        isSelected: false,
      })));
      setSelectAll(false);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load products", false);
    } finally {
      setBatch(false);
    }
  }, [searchQ, catFilter, brandFilter, showToast]);

  /* ── Recalculate on rate change ── */
  useEffect(() => {
    setRows(prev => prev.map(row => {
      const v = parseFloat(row.marketInr);
      if (!isNaN(v) && v > 0)
        return { ...row, result: calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate }) };
      return row;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRate]);

  /* ── Filtered + sorted display rows ── */
  const displayRows = useMemo(() => {
    let list = rows;
    if (filterTab === "unpriced") list = list.filter(r => r.state === "unpriced" || r.state === "modified" || r.state === "error");
    if (filterTab === "priced")   list = list.filter(r => r.state === "priced" || r.state === "saved");
    const order: Record<PricingState, number> = { unpriced: 0, modified: 1, error: 2, saving: 3, priced: 4, saved: 5 };
    if (sortKey === "unpriced_first") list = [...list].sort((a, b) => order[a.state] - order[b.state]);
    if (sortKey === "name")           list = [...list].sort((a, b) => a.product.title.localeCompare(b.product.title));
    if (sortKey === "price_asc")      list = [...list].sort((a, b) => (a.product.price ?? 0) - (b.product.price ?? 0));
    if (sortKey === "price_desc")     list = [...list].sort((a, b) => (b.product.price ?? 0) - (a.product.price ?? 0));
    return list;
  }, [rows, filterTab, sortKey]);

  /* ── Row update ── */
  const updateRow = (id: string, val: string) => {
    setRows(prev => prev.map(row => {
      if (row.product.id !== id) return row;
      const v = parseFloat(val);
      const result = (!isNaN(v) && v > 0) ? calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate }) : null;
      // Modified means "has a calculated result not yet saved"
      // If the input is cleared and product was already priced via tool, revert to priced
      const wasToolPriced = loadPricedIds().has(id);
      const newState: PricingState = result
        ? "modified"
        : wasToolPriced ? "priced" : "unpriced";
      return { ...row, marketInr: val, result, state: newState };
    }));
  };

  const setImgErr = (id: string) =>
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, imgErr: true } : r));

  /* ── Manual "Mark as Priced" — admin decision, no price recalc required ── */
  const markAsPriced = (id: string) => {
    savePricedId(id);
    setRows(prev => prev.map(r =>
      r.product.id === id
        ? { ...r, state: "priced", toolPrice: r.product.price ?? null }
        : r
    ));
    showToast("Product marked as priced");
  };

  /* ── Manual "Mark as Unpriced" — admin resets it ── */
  const markAsUnpriced = (id: string) => {
    removePricedId(id);
    setRows(prev => prev.map(r =>
      r.product.id === id
        ? { ...r, state: "unpriced", toolPrice: null, marketInr: "", result: null }
        : r
    ));
    showToast("Product reset to unpriced", false);
  };

  /* ── Quick fill ── */
  const applyQuickFill = () => {
    const v = parseFloat(quickFillInr);
    if (isNaN(v) || v <= 0) return;
    const result = calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate });
    let count = 0;
    setRows(prev => prev.map(row => {
      if (row.state !== "unpriced") return row;
      count++;
      return { ...row, marketInr: String(v), result, state: "modified" };
    }));
    showToast(`Applied ₹${v.toLocaleString()} to ${count} unpriced products`);
    setFill("");
  };

  /* ── Select ── */
  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setRows(prev => prev.map(r => ({ ...r, isSelected: next })));
  };
  const toggleRow = (id: string) =>
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, isSelected: !r.isSelected } : r));

  /* ── Save single ── */
  const saveRow = async (id: string) => {
    const row = rows.find(r => r.product.id === id);
    if (!row?.result) return;
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, state: "saving" } : r));
    try {
      await pricingApi.applyToProduct(id, row.result.final_price_lsl, row.result.compare_price_lsl);
      // Mark this product as priced via tool in localStorage
      savePricedId(id);
      setRows(prev => prev.map(r =>
        r.product.id === id
          ? { ...r, state: "saved", toolPrice: r.result?.final_price_lsl ?? r.toolPrice }
          : r
      ));
    } catch (e: any) {
      setRows(prev => prev.map(r =>
        r.product.id === id ? { ...r, state: "error", errorMsg: e?.message } : r
      ));
    }
  };

  /* ── Save all / selected ── */
  const saveAll = async (selectedOnly = false) => {
    const toSave = rows.filter(r =>
      r.result &&
      r.state !== "saved" &&
      r.state !== "saving" &&
      r.state !== "priced" &&
      (!selectedOnly || r.isSelected)
    );
    if (!toSave.length) { showToast("No calculated prices to save.", false); return; }
    setBulkSaving(true);
    setRows(prev => prev.map(r =>
      toSave.some(t => t.product.id === r.product.id) ? { ...r, state: "saving" } : r
    ));
    const items = toSave.map(r => ({
      product_id: r.product.id, price_lsl: r.result!.final_price_lsl, compare_price_lsl: r.result!.compare_price_lsl,
    }));
    const res = await pricingApi.bulkApply(items);

    // Update localStorage for successfully saved products
    toSave.forEach(r => {
      const failed = res.errors.some((e: string) => e.startsWith(r.product.id));
      if (!failed) savePricedId(r.product.id);
    });

    setRows(prev => prev.map(r => {
      const wasSaving = toSave.some(t => t.product.id === r.product.id);
      if (!wasSaving) return r;
      const failed = res.errors.some((e: string) => e.startsWith(r.product.id));
      return {
        ...r,
        state: failed ? "error" : "saved",
        toolPrice: failed ? r.toolPrice : (r.result?.final_price_lsl ?? r.toolPrice),
      };
    }));
    setBulkSaving(false);
    showToast(`${res.success} prices saved${res.failed ? `, ${res.failed} failed` : ""}`, res.failed === 0);
  };

  /* ── Keyboard nav ── */
  const handleKeyDown = (e: React.KeyboardEvent, currentId: string) => {
    if (e.key !== "Tab" && e.key !== "Enter") return;
    e.preventDefault();
    const ids = displayRows.map(r => r.product.id);
    const nextId = ids[ids.indexOf(currentId) + 1];
    if (nextId) {
      const nextIdx = rows.findIndex(r => r.product.id === nextId);
      inputRefs.current.get(nextIdx)?.focus();
    }
  };

  /* ════════════════ RENDER ════════════════ */
  return (
    <>
      <style>{`
        @keyframes toastSlide { from{opacity:0;transform:translateX(22px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shimmer    { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes spin       { to{transform:rotate(360deg)} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseRing  { 0%,100%{box-shadow:0 0 0 0 rgba(200,167,90,0)} 50%{box-shadow:0 0 0 6px rgba(200,167,90,0.25)} }

        .pm * { box-sizing:border-box; }
        /* Full-viewport fixed layout — outer shell never scrolls */
        .pm {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: var(--font-sans, system-ui, sans-serif);
          background: var(--gray-50, #f9fafb);
        }
        /* Top chrome: header + toolbar — fixed height, never scrolls */
        .pm-chrome {
          flex-shrink: 0;
          padding: 6px 14px 0;
          background: white;
          border-bottom: 1px solid var(--gray-200);
        }
        /* The only scrolling region — grows to fill remaining height */
        .pm-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
        }
        .pm-body-inner {
          padding: 10px 14px 20px;
        }

        .pm-inr {
          padding:5px 7px 5px 20px !important; border-radius:6px !important;
          border:1.5px solid var(--gray-300) !important; background:var(--gray-50) !important;
          color:var(--gray-900) !important; font-size:12px !important; font-weight:700 !important;
          width:92px !important; min-height:unset !important; outline:none !important;
          font-family:inherit !important; transition:border-color .15s,box-shadow .15s,background .15s !important;
        }
        .pm-inr:focus { border-color:var(--accent) !important; box-shadow:0 0 0 3px rgba(200,167,90,.18) !important; background:white !important; }
        .pm-inr::placeholder { color:var(--gray-300) !important; font-weight:400 !important; }
        .pm-inr:disabled { opacity:.4 !important; cursor:not-allowed !important; }
        .pm-inr[data-f="1"] { border-color:var(--accent) !important; background:rgba(200,167,90,.05) !important; }

        .pm-si { padding:6px 10px !important; border-radius:6px !important; border:1.5px solid var(--gray-200) !important; background:white !important; color:var(--gray-900) !important; font-size:12px !important; min-height:unset !important; outline:none !important; font-family:inherit !important; transition:border-color .15s !important; }
        .pm-si:focus { border-color:var(--primary) !important; box-shadow:0 0 0 3px rgba(15,63,47,.1) !important; }
        .pm-si::placeholder { color:var(--gray-300) !important; }
        .pm-sel { padding:6px 24px 6px 9px !important; border-radius:6px !important; border:1.5px solid var(--gray-200) !important; background:white !important; color:var(--gray-700) !important; font-size:12px !important; min-height:unset !important; outline:none !important; font-family:inherit !important; appearance:none !important; cursor:pointer !important; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") !important; background-repeat:no-repeat !important; background-position:right 7px center !important; }
        .pm-sel:focus { border-color:var(--primary) !important; }

        .pm-b { display:inline-flex !important; align-items:center !important; gap:4px !important; padding:5px 11px !important; border-radius:6px !important; font-size:11px !important; font-weight:700 !important; border:none !important; cursor:pointer !important; font-family:inherit !important; min-height:unset !important; white-space:nowrap !important; transition:all .15s ease !important; }
        .pm-b:active:not(:disabled) { transform:scale(.97) !important; }
        .pm-bg { background:var(--primary) !important; color:white !important; box-shadow:0 2px 6px rgba(15,63,47,.2) !important; }
        .pm-bg:hover:not(:disabled) { background:var(--primary-light) !important; box-shadow:0 4px 14px rgba(15,63,47,.3) !important; }
        .pm-bg:disabled { background:var(--gray-200) !important; color:var(--gray-400) !important; box-shadow:none !important; cursor:not-allowed !important; }
        .pm-ba { background:var(--accent) !important; color:white !important; box-shadow:0 2px 6px rgba(200,167,90,.3) !important; }
        .pm-ba:hover:not(:disabled) { background:var(--accent-light) !important; }
        .pm-ba:disabled { opacity:.5 !important; cursor:not-allowed !important; }
        .pm-bgh { background:white !important; color:var(--gray-700) !important; border:1.5px solid var(--gray-200) !important; }
        .pm-bgh:hover:not(:disabled) { border-color:var(--primary) !important; color:var(--primary) !important; }
        .pm-bbl { background:#2563eb !important; color:white !important; }
        .pm-bbl:disabled { opacity:.45 !important; cursor:not-allowed !important; }
        .pm-bmk { background:#f0fdf4 !important; color:#14532d !important; border:1.5px solid #bbf7d0 !important; font-size:10px !important; padding:3px 8px !important; }
        .pm-bmk:hover:not(:disabled) { background:#dcfce7 !important; }
        .pm-bum { background:#fff7ed !important; color:#92400e !important; border:1.5px solid #fed7aa !important; font-size:10px !important; padding:3px 8px !important; }
        .pm-bum:hover:not(:disabled) { background:#ffedd5 !important; }

        .pm-tab { display:inline-flex !important; align-items:center !important; gap:5px !important; padding:5px 13px !important; border-radius:var(--radius-sm) !important; font-size:12px !important; font-weight:700 !important; border:1.5px solid transparent !important; cursor:pointer !important; font-family:inherit !important; min-height:unset !important; transition:all .18s !important; }
        .pm-ta { background:var(--primary) !important; color:white !important; border-color:var(--primary) !important; }
        .pm-ti { background:white !important; color:var(--gray-600) !important; border-color:var(--gray-200) !important; }
        .pm-ti:hover { border-color:var(--primary) !important; color:var(--primary) !important; }
        .pm-ft { display:inline-flex !important; align-items:center !important; gap:5px !important; padding:4px 12px !important; border-radius:20px !important; font-size:11px !important; font-weight:700 !important; border:1.5px solid transparent !important; cursor:pointer !important; font-family:inherit !important; min-height:unset !important; transition:all .15s !important; }

        .pm-row { transition:background .18s ease; }
        .pm-row:hover > td { background-color: rgba(0,0,0,0.012) !important; }
        .pm-sk { background:linear-gradient(90deg,var(--gray-100) 25%,var(--gray-50) 50%,var(--gray-100) 75%); background-size:600px 100%; animation:shimmer 1.6s infinite; border-radius:6px; }
        .pm-spin { animation:spin .8s linear infinite; display:inline-block; }
        .pm-mt { width:32px; height:4px; border-radius:3px; background:var(--gray-200); overflow:hidden; margin-top:2px; }
        .pm-mf { height:100%; border-radius:3px; transition:width .4s ease; }
        .pm-up { animation:fadeUp .4s cubic-bezier(.22,.9,.34,1) both; }
        .pm-sf { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); z-index:9900; animation:fadeUp .3s cubic-bezier(.22,.9,.34,1); }

        .pm-unp-notice {
          display:inline-flex; align-items:center; gap:4px;
          font-size:10px; color:#92400e; font-weight:600;
          background:#fffbeb; border:1px solid #fde68a;
          padding:1px 6px; border-radius:4px;
        }

        /* Table fills its container, thead sticky */
        .pm-table-wrap {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .pm-table-scroll {
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(100dvh - 180px);
        }
        .pm-table-scroll thead th {
          position: sticky;
          top: 0;
          z-index: 2;
        }
      `}</style>

      <div className="pm">

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 16, right: 16, zIndex: 99999,
            background: toast.ok ? "var(--primary)" : "#dc2626", color: "white",
            padding: "10px 18px", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 13,
            boxShadow: "var(--shadow-strong)", display: "flex", alignItems: "center", gap: 8,
            animation: "toastSlide 0.3s ease",
          }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center", fontSize: 11, flexShrink: 0 }}>
              {toast.ok ? "✓" : "✗"}
            </span>
            {toast.msg}
          </div>
        )}

        {/* ══ CHROME: fixed top bar ══ */}
        <div className="pm-chrome">

          {/* Row 1: title + rate + tabs all inline */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 6, borderBottom: "1px solid var(--gray-100)", flexWrap: "wrap" }}>
            {/* Back + title */}
            <Link href="/admin" style={{ fontSize: 11, color: "var(--gray-400)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M5 12l7 7M5 12l7-7"/></svg>
            </Link>
            <span style={{ color: "var(--gray-200)", fontSize: 11 }}>›</span>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,var(--primary),var(--primary-light))", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <span style={{ fontWeight: 900, fontSize: 15, color: "var(--gray-900)", letterSpacing: -0.3 }}>Pricing Manager</span>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "var(--gray-200)", margin: "0 4px", flexShrink: 0 }} />

            {/* Tabs */}
            {([
              { id: "batch", icon: "⚡", label: `Batch${rows.length ? ` (${rows.length})` : ""}` },
              { id: "calc",  icon: "🧮", label: "Calculator" },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id as MainTab)}
                className={`pm-b pm-tab ${mainTab === t.id ? "pm-ta" : "pm-ti"}`}>
                {t.icon} {t.label}
              </button>
            ))}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Exchange rate — compact inline */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: rateLoading ? "var(--gray-300)" : rateSrc === "live" ? "#16a34a" : "#d97706",
              }} />
              <span style={{ fontWeight: 600, color: "var(--gray-500)" }}>
                {rateLoading ? "…" : `1₹ = M${effectiveRate.toFixed(4)}`}
              </span>
              {rateOverride && <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(200,167,90,0.15)", color: "var(--accent)", padding: "1px 5px", borderRadius: 20 }}>OVERRIDE</span>}
              <input type="number" placeholder="Override…" value={rateOverride} onChange={e => setOverride(e.target.value)} step="0.0001"
                className="pm-si" style={{ width: 90 }} />
              {rateOverride && <button onClick={() => setOverride("")} className="pm-b pm-bgh" style={{ padding: "3px 8px !important", fontSize: 10 }}>✕</button>}
            </div>
          </div>

          {/* Row 2 (batch mode only): search + filters + save bar + progress — all in one row */}
          {mainTab === "batch" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", flexWrap: "wrap" }}>

              {/* Search */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2"
                  style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === "Enter" && loadProducts()}
                  placeholder="Search…" className="pm-si" style={{ paddingLeft: "26px !important", width: 160 }} />
              </div>

              <select value={catFilter} onChange={e => setCat(e.target.value)} className="pm-sel" style={{ maxWidth: 130 }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={brandFilter} onChange={e => setBrand(e.target.value)} className="pm-sel" style={{ maxWidth: 120 }}>
                <option value="">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <button onClick={() => loadProducts()} disabled={batchLoading} className="pm-b pm-bg">
                {batchLoading
                  ? <><span className="pm-spin" style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} /></>
                  : rows.length > 0 ? "🔄" : "⚡ Load"}
              </button>

              {/* Filter tabs */}
              {rows.length > 0 && <>
                <div style={{ width: 1, height: 18, background: "var(--gray-200)", flexShrink: 0 }} />
                {([
                  { id: "all",      label: "All",      count: rows.length,    bg: "var(--gray-900)", fg: "white" },
                  { id: "unpriced", label: "⚠ Unpriced", count: stats.unpriced + stats.modified + stats.errors, bg: "#d97706", fg: "white" },
                  { id: "priced",   label: "✓ Priced", count: stats.priced,   bg: "var(--primary)",  fg: "white" },
                ] as const).map(t => {
                  const active = filterTab === t.id;
                  return (
                    <button key={t.id} onClick={() => setFilterTab(t.id)} className="pm-ft"
                      style={{ background: active ? t.bg : "white", color: active ? t.fg : "var(--gray-600)", border: `1.5px solid ${active ? "transparent" : "var(--gray-200)"}` }}>
                      {t.label}
                      <span style={{ background: active ? "rgba(255,255,255,0.2)" : "var(--gray-100)", color: active ? "white" : "var(--gray-500)", padding: "0px 6px", borderRadius: 20, fontSize: 10, fontWeight: 800 }}>{t.count}</span>
                    </button>
                  );
                })}
              </>}

              {/* Sort */}
              {rows.length > 0 && <select value={sortKey} onChange={e => setSort(e.target.value as SortKey)} className="pm-sel">
                <option value="unpriced_first">⚠ First</option>
                <option value="default">Default</option>
                <option value="name">A–Z</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>}

              {/* Highlight checkbox */}
              {rows.length > 0 && <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--gray-600)", cursor: "pointer", userSelect: "none", flexShrink: 0 }}>
                <input type="checkbox" checked={highlightUnpriced} onChange={e => setHL(e.target.checked)} style={{ accentColor: "var(--primary)", width: 12, height: 12, cursor: "pointer", minHeight: "unset" }} />
                Highlight
              </label>}

              {/* Quick fill */}
              {rows.length > 0 && stats.unpriced > 0 && <>
                <div style={{ width: 1, height: 18, background: "var(--gray-200)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", flexShrink: 0 }}>Quick Fill:</span>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "var(--accent)", pointerEvents: "none" }}>₹</span>
                  <input type="number" value={quickFillInr} onChange={e => setFill(e.target.value)} onKeyDown={e => e.key === "Enter" && applyQuickFill()}
                    placeholder="price" className="pm-inr" data-f={quickFillInr !== "" ? "1" : undefined} style={{ width: "80px !important", paddingLeft: "18px !important" }} />
                </div>
                <button onClick={applyQuickFill} disabled={!quickFillInr} className="pm-b pm-ba" style={{ padding: "4px 10px !important" }}>Apply</button>
              </>}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Progress inline */}
              {rows.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, flexShrink: 0 }}>
                <div style={{ background: "var(--gray-100)", borderRadius: 20, height: 6, width: 80, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${stats.pctDone}%`, background: stats.pctDone === 100 ? "var(--primary)" : "#d97706", borderRadius: 20, transition: "width 0.6s" }} />
                </div>
                <span style={{ fontWeight: 700, color: "var(--gray-500)" }}>{stats.pctDone}%</span>
                <span style={{ color: "var(--gray-300)" }}>|</span>
                <span style={{ color: "#d97706", fontWeight: 700 }}>{stats.unpriced} left</span>
                <span style={{ color: "var(--gray-300)" }}>|</span>
                <span style={{ color: "var(--primary)", fontWeight: 700 }}>{stats.priced} done</span>
              </div>}

              {/* Save buttons */}
              {rows.length > 0 && <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                {stats.selectedReady > 0 && (
                  <button onClick={() => saveAll(true)} disabled={bulkSaving} className="pm-b pm-bbl">
                    💾 Selected ({stats.selectedReady})
                  </button>
                )}
                <button onClick={() => saveAll(false)} disabled={bulkSaving || stats.readyToSave === 0} className="pm-b pm-bg">
                  {bulkSaving
                    ? <><span className="pm-spin" style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} /> Saving…</>
                    : `💾 Save All (${stats.readyToSave})`}
                </button>
              </div>}
            </div>
          )}
        </div>
        {/* ══ END CHROME ══ */}

        {/* ══ SCROLLABLE BODY ══ */}
        <div className="pm-body">
          <div className="pm-body-inner">

        {/* ══ QUICK CALCULATOR ══ */}
        {mainTab === "calc" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 800 }}>
            {/* Input card */}
            <div className="card pm-up" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(200,167,90,0.1)", display: "grid", placeItems: "center" }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>₹</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Indian Market Price</div>
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: 8 }}>
                Market Price (₹) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ position: "relative", marginBottom: 20 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 22, fontWeight: 700, color: "var(--accent)", pointerEvents: "none" }}>₹</span>
                <input type="number" value={qMarket} onChange={e => setQMarket(e.target.value)} placeholder="2499" autoFocus
                  style={{ width: "100%", padding: "14px 16px 14px 40px", border: `2px solid ${qResult ? "var(--accent)" : "var(--gray-200)"}`, borderRadius: "var(--radius-md)", fontSize: 30, fontWeight: 900, color: "var(--gray-900)", outline: "none", fontFamily: "inherit", background: qResult ? "rgba(200,167,90,0.04)" : "white", transition: "border-color 0.2s", minHeight: "unset" }} />
              </div>
              <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>Applied automatically</div>
                {([["🚚 Shipping", "₹700 fixed"], ["💼 Profit", "₹500 fixed"], ["💱 Rate", `M ${effectiveRate.toFixed(5)}`]] as const).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--gray-200)", fontSize: 13 }}>
                    <span style={{ color: "var(--gray-500)" }}>{k}</span>
                    <span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Result card */}
            <div className="card pm-up" style={{ padding: 20 }}>
              {qResult ? (
                <>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18 }}>Price Breakdown</div>
                  {([
                    ["Market",     `₹ ${qVal.toLocaleString()}`,                 "var(--gray-900)"],
                    ["+ Shipping", `₹ ${qResult.shipping_cost_inr.toLocaleString()}`, "var(--gray-500)"],
                    ["+ Profit",   `₹ ${qResult.profit_inr.toLocaleString()}`,    "var(--gray-500)"],
                  ] as const).map(([k, v, c]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--gray-100)", fontSize: 14 }}>
                      <span style={{ color: "var(--gray-500)" }}>{k}</span>
                      <span style={{ fontWeight: 700, color: c as string }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 14px", fontSize: 14, borderBottom: "2px solid var(--gray-900)" }}>
                    <span style={{ fontWeight: 700 }}>Total (INR)</span>
                    <span style={{ fontWeight: 900 }}>₹ {qResult.total_cost_inr.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: "var(--gray-400)" }}>
                    <span>× Exchange Rate</span>
                    <span style={{ fontWeight: 700 }}>× {effectiveRate.toFixed(5)}</span>
                  </div>
                  <div style={{ marginTop: 12, background: "linear-gradient(135deg,rgba(15,63,47,0.06),rgba(15,63,47,0.02))", border: "2px solid rgba(15,63,47,0.15)", borderRadius: "var(--radius-md)", padding: "16px 16px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: "rgba(15,63,47,0.04)", borderRadius: "50%" }} />
                    <div style={{ fontSize: 10, color: "var(--gray-400)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 3 }}>FINAL PRICE (MALOTI)</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: "var(--primary)", letterSpacing: -1.5, lineHeight: 1.1 }}>M {fmt(qResult.final_price_lsl)}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "var(--gray-300)", textDecoration: "line-through" }}>M {fmt(qResult.compare_price_lsl)}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, background: "rgba(15,63,47,0.08)", borderRadius: 20, padding: "5px 14px", fontSize: 13, color: "var(--primary)" }}>
                      <span style={{ fontWeight: 800 }}>{qResult.discount_pct}% off</span>
                      <span style={{ opacity: 0.65 }}>· saves M {fmt(qResult.savings_lsl)}</span>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: marginPct(qResult) < 8 ? "#dc2626" : marginPct(qResult) < 15 ? "#d97706" : "var(--primary)" }}>
                      Margin: {marginPct(qResult)}%{marginPct(qResult) < 8 ? " ⚠ Too low" : marginPct(qResult) < 15 ? " — Acceptable" : " ✓ Healthy"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    {([["Compare", fmt(qResult.compare_price_lsl), "var(--accent)"], ["Savings", fmt(qResult.savings_lsl), "var(--primary)"]] as const).map(([l, v, c]) => (
                      <div key={l} style={{ flex: 1, textAlign: "center", padding: "10px 12px", background: `rgba(${c === "var(--accent)" ? "200,167,90" : "15,63,47"},0.06)`, borderRadius: "var(--radius-sm)", border: `1px solid rgba(${c === "var(--accent)" ? "200,167,90" : "15,63,47"},0.12)` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: c as string }}>M {v}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ height: "100%", minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--gray-50)", border: "1px solid var(--gray-200)", display: "grid", placeItems: "center" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--gray-400)", margin: 0, maxWidth: 240 }}>Enter a market price to calculate the Maloti selling price</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ BATCH PRICING ══ */}
        {mainTab === "batch" && (
          <div>

            {/* ── Empty state ── */}
            {rows.length === 0 && !batchLoading && (
              <div style={{ background: "white", border: "2px dashed var(--gray-200)", borderRadius: "var(--radius-lg)", padding: "40px 40px", textAlign: "center", boxShadow: "var(--shadow-soft)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px", background: "linear-gradient(135deg,rgba(15,63,47,0.08),rgba(200,167,90,0.1))", display: "grid", placeItems: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                  </svg>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--gray-900)", marginBottom: 8 }}>Ready to price your catalog</div>
                <p style={{ fontSize: 13, color: "var(--gray-400)", maxWidth: 420, margin: "0 auto 18px" }}>
                  All products load as <strong>Unpriced</strong>. Use the tool to calculate and save prices, or manually mark products as priced.
                </p>
                <button onClick={() => loadProducts()} className="pm-b pm-bg" style={{ padding: "12px 32px !important", fontSize: 14 }}>⚡ Load Products</button>
              </div>
            )}

            {/* ── Skeleton ── */}
            {batchLoading && rows.length === 0 && (
              <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                {[...Array(7)].map((_, i) => (
                  <div key={i} style={{ padding: "18px 24px", display: "flex", gap: 16, alignItems: "center", borderBottom: "1px solid var(--gray-100)", opacity: 1 - i * 0.1 }}>
                    <div className="pm-sk" style={{ width: 56, height: 56, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="pm-sk" style={{ width: `${50 + i * 6}%`, height: 13, marginBottom: 8 }} />
                      <div className="pm-sk" style={{ width: "25%", height: 10 }} />
                    </div>
                    <div className="pm-sk" style={{ width: 116, height: 36, flexShrink: 0 }} />
                    <div className="pm-sk" style={{ width: 70, height: 36, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}

            {/* ══ THE TABLE ══ */}
            {displayRows.length > 0 && (
              <div className="pm-table-wrap">
                <div className="pm-table-scroll">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                    <thead>
                      <tr style={{ background: "var(--gray-50)", borderBottom: "2px solid var(--gray-200)" }}>
                        <th style={{ ...TH, width: 36, paddingLeft: 18 }}>
                          <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ accentColor: "var(--primary)", width: 14, height: 14, cursor: "pointer", minHeight: "unset" }} />
                        </th>
                        <th style={{ ...TH, width: 4, padding: 0 }} />
                        <th style={{ ...TH, textAlign: "left", minWidth: 280 }}>Product</th>
                        <th style={TH}>Status</th>
                        <th style={{ ...TH, textAlign: "right" }}>DB Price</th>
                        <th style={{ ...TH, textAlign: "center", minWidth: 130 }}>Market Price (₹)</th>
                        <th style={{ ...TH, textAlign: "right" }}>Cost (₹)</th>
                        <th style={{ ...TH, textAlign: "right", minWidth: 130, color: "var(--primary)" }}>→ Final (M)</th>
                        <th style={{ ...TH, textAlign: "right" }}>Compare (M)</th>
                        <th style={{ ...TH, textAlign: "center" }}>Margin</th>
                        <th style={{ ...TH, textAlign: "center" }}>Disc%</th>
                        <th style={{ ...TH, textAlign: "center", minWidth: 150 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map(row => {
                        const gIdx = rows.findIndex(r => r.product.id === row.product.id);
                        const { state } = row;
                        const isUp    = state === "unpriced";
                        const isMod   = state === "modified";
                        const isSaved = state === "saved";
                        const isPriced = state === "priced";
                        const isErr   = state === "error";
                        const isSav   = state === "saving";

                        const rowBg = isErr     ? "rgba(220,38,38,0.04)"
                                    : isSaved   ? "rgba(22,163,74,0.04)"
                                    : isPriced  ? "rgba(15,63,47,0.02)"
                                    : isMod     ? "rgba(37,99,235,0.03)"
                                    : (isUp && highlightUnpriced) ? "rgba(217,119,6,0.04)"
                                    : "transparent";

                        const barC = isErr     ? "#dc2626"
                                   : isSaved   ? "#16a34a"
                                   : isPriced  ? "var(--primary)"
                                   : isMod     ? "#2563eb"
                                   : isUp      ? "#d97706"
                                   : "transparent";

                        const mColor = marginColor(row.result);
                        const mPct   = row.result ? marginPct(row.result) : 0;

                        return (
                          <tr key={row.product.id} className="pm-row" style={{ borderBottom: "1px solid var(--gray-100)" }}>
                            {/* Checkbox */}
                            <td style={{ ...TD, background: rowBg, width: 36, paddingLeft: 18 }}>
                              <input type="checkbox" checked={row.isSelected} onChange={() => toggleRow(row.product.id)} style={{ accentColor: "var(--primary)", width: 14, height: 14, cursor: "pointer", minHeight: "unset" }} />
                            </td>

                            {/* State bar */}
                            <td style={{ padding: 0, width: 4, background: rowBg }}>
                              <div style={{ width: 3, minHeight: 38, background: barC, transition: "background 0.25s" }} />
                            </td>

                            {/* Product info */}
                            <td style={{ ...TD, background: rowBg, minWidth: 260 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 6, overflow: "hidden", border: "1px solid var(--gray-200)", background: "var(--gray-50)", display: "grid", placeItems: "center" }}>
                                  {(row.product as any).main_image && !row.imgErr ? (
                                    <img src={(row.product as any).main_image} alt={row.product.title} onError={() => setImgErr(row.product.id)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5">
                                      <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                                    </svg>
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 11, color: "var(--gray-900)", maxWidth: 180, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.25 }}>
                                    {row.product.title}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 3 }}>
                                    {[row.product.brand, row.product.category].filter(Boolean).join(" · ") || "—"}
                                  </div>
                                  {row.product.sku && <div style={{ fontSize: 10, color: "var(--gray-300)", marginTop: 1, fontFamily: "monospace" }}>SKU: {row.product.sku}</div>}
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ ...TD, background: rowBg }}><PricingBadge state={state} /></td>

                            {/* DB Price — shown as info only, not used to determine pricing state */}
                            <td style={{ ...TD, background: rowBg, textAlign: "right" }}>
                              {row.product.price && row.product.price > 0 ? (
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--gray-400)" }}>
                                    M {fmt(row.product.price)}
                                  </div>
                                  {(isPriced || isSaved) && row.toolPrice && (
                                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 1, color: "var(--primary)" }}>
                                      ✓ via tool
                                    </div>
                                  )}
                                  {isUp && row.product.price > 0 && (
                                    <div className="pm-unp-notice" style={{ marginTop: 3 }}>
                                      not reviewed
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: "var(--gray-300)" }}>No price</span>
                              )}
                            </td>

                            {/* INR input */}
                            <td style={{ ...TD, background: rowBg, textAlign: "center" }}>
                              <div style={{ position: "relative", display: "inline-block" }}>
                                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "var(--accent)", pointerEvents: "none" }}>₹</span>
                                <input
                                  ref={el => { if (el) inputRefs.current.set(gIdx, el); else inputRefs.current.delete(gIdx); }}
                                  type="number" value={row.marketInr}
                                  onChange={e => updateRow(row.product.id, e.target.value)}
                                  onKeyDown={e => handleKeyDown(e, row.product.id)}
                                  placeholder="price" disabled={isSav}
                                  className="pm-inr" data-f={row.marketInr !== "" ? "1" : undefined}
                                />
                              </div>
                            </td>

                            {/* Total cost INR */}
                            <td style={{ ...TD, background: rowBg, textAlign: "right" }}>
                              {row.result ? <span style={{ color: "var(--gray-400)", fontSize: 12 }}>₹{row.result.total_cost_inr.toLocaleString()}</span> : <span style={{ color: "var(--gray-200)" }}>—</span>}
                            </td>

                            {/* Final price */}
                            <td style={{ ...TD, background: rowBg, textAlign: "right" }}>
                              {row.result ? (
                                <span style={{ fontWeight: 900, fontSize: 14, color: "var(--primary)", background: "rgba(15,63,47,0.07)", padding: "2px 8px", borderRadius: 6, display: "inline-block" }}>
                                  M {fmt(row.result.final_price_lsl)}
                                </span>
                              ) : <span style={{ color: "var(--gray-200)" }}>—</span>}
                            </td>

                            {/* Compare price */}
                            <td style={{ ...TD, background: rowBg, textAlign: "right" }}>
                              {row.result ? <span style={{ color: "var(--gray-300)", fontSize: 12, textDecoration: "line-through" }}>M {fmt(row.result.compare_price_lsl)}</span> : <span style={{ color: "var(--gray-200)" }}>—</span>}
                            </td>

                            {/* Margin health */}
                            <td style={{ ...TD, background: rowBg, textAlign: "center" }}>
                              {row.result ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <span style={{ fontWeight: 800, fontSize: 13, color: mColor }}>{mPct}%</span>
                                  <div className="pm-mt">
                                    <div className="pm-mf" style={{ width: `${Math.min(mPct / 30 * 100, 100)}%`, background: mColor }} />
                                  </div>
                                </div>
                              ) : <span style={{ color: "var(--gray-200)" }}>—</span>}
                            </td>

                            {/* Discount % */}
                            <td style={{ ...TD, background: rowBg, textAlign: "center" }}>
                              {row.result ? (
                                <span style={{ background: "#dcfce7", color: "#14532d", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                                  {row.result.discount_pct}%
                                </span>
                              ) : <span style={{ color: "var(--gray-200)" }}>—</span>}
                            </td>

                            {/* Action column — Save + Mark as Priced/Unpriced */}
                            <td style={{ ...TD, background: rowBg, textAlign: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                                {/* Primary action */}
                                {isSav && (
                                  <span className="pm-spin" style={{ width: 18, height: 18, border: "2.5px solid var(--gray-200)", borderTopColor: "var(--primary)", borderRadius: "50%" }} />
                                )}
                                {isErr && (
                                  <button onClick={() => saveRow(row.product.id)} title={row.errorMsg}
                                    className="pm-b" style={{ background: "#fee2e2 !important", color: "#991b1b !important", border: "1px solid #fca5a5 !important", fontSize: 11, padding: "5px 10px !important" }}>
                                    Retry
                                  </button>
                                )}
                                {isSaved && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(22,163,74,0.1)", display: "grid", placeItems: "center" }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>Saved</span>
                                  </div>
                                )}
                                {!isSav && !isErr && !isSaved && (
                                  <button
                                    onClick={() => saveRow(row.product.id)}
                                    disabled={!row.result}
                                    className="pm-b"
                                    style={{
                                      background: row.result ? "var(--primary) !important" : "var(--gray-100) !important",
                                      color: row.result ? "white !important" : "var(--gray-300) !important",
                                      boxShadow: row.result ? "0 2px 6px rgba(15,63,47,0.2) !important" : "none !important",
                                      cursor: row.result ? "pointer !important" : "not-allowed !important",
                                      padding: "6px 14px !important", fontSize: 12,
                                    }}>
                                    Save
                                  </button>
                                )}

                                {/* Secondary: Mark as Priced / Unpriced */}
                                {(isUp || isMod) && !isSav && (
                                  <button
                                    onClick={() => markAsPriced(row.product.id)}
                                    className="pm-b pm-bmk"
                                    title="Mark this product as priced without recalculating"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                    Mark Priced
                                  </button>
                                )}
                                {(isPriced || isSaved) && !isSav && (
                                  <button
                                    onClick={() => markAsUnpriced(row.product.id)}
                                    className="pm-b pm-bum"
                                    title="Reset this product to unpriced — requires re-review"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>
                                    Reset
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table footer */}
                <div style={{ padding: "7px 14px", borderTop: "1px solid var(--gray-100)", background: "var(--gray-50)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 10, color: "var(--gray-400)" }}>
                  <span>📦 {rows.length} loaded</span>
                  <span>✏️ {stats.withResult} calculated</span>
                  <span style={{ color: "#d97706", fontWeight: 700 }}>⚠ {stats.unpriced} unpriced</span>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓ {stats.priced} priced</span>
                  {stats.errors > 0 && <span style={{ color: "#dc2626", fontWeight: 700 }}>✗ {stats.errors} errors</span>}
                  {totalCount > rows.length && <span style={{ marginLeft: "auto" }}>Showing {rows.length} of {totalCount}</span>}
                </div>
              </div>
            )}
          </div>
        )}

          </div>{/* end pm-body-inner */}
        </div>{/* end pm-body */}

        {/* ══ STICKY SAVE BAR ══ */}
        {stats.readyToSave > 0 && (
          <div className="pm-sf">
            <div style={{
              background: "white",
              border: "1.5px solid var(--gray-200)",
              borderRadius: "var(--radius-lg)",
              padding: "12px 20px",
              display: "flex", alignItems: "center", gap: 16,
              boxShadow: "0 16px 48px rgba(0,0,0,0.12),0 4px 12px rgba(0,0,0,0.08)",
              minWidth: 380,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, animation: "pulseRing 2.5s infinite" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--gray-900)" }}>{stats.readyToSave} price{stats.readyToSave !== 1 ? "s" : ""} ready to save</div>
                <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Changes won&apos;t appear in your store until saved</div>
              </div>
              <button
                onClick={() => saveAll(false)}
                disabled={bulkSaving}
                style={{
                  padding: "9px 20px", borderRadius: "var(--radius-sm)",
                  background: "var(--primary)", color: "white",
                  border: "none", cursor: bulkSaving ? "not-allowed" : "pointer",
                  fontWeight: 800, fontSize: 13, fontFamily: "inherit",
                  boxShadow: "0 4px 16px rgba(15,63,47,0.25)",
                  minHeight: "unset", transition: "all 0.15s", whiteSpace: "nowrap",
                }}>
                {bulkSaving
                  ? <><span className="pm-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", marginRight: 8 }} />Saving…</>
                  : `💾 Save All (${stats.readyToSave})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   STYLE CONSTANTS
═══════════════════════════════════════════════════ */
const TH: React.CSSProperties = {
  padding: "7px 8px", fontSize: 9, fontWeight: 700,
  color: "var(--gray-400)", textTransform: "uppercase",
  letterSpacing: "0.5px", whiteSpace: "nowrap", textAlign: "center",
  background: "var(--gray-50)",
};

const TD: React.CSSProperties = {
  padding: "6px 8px", fontSize: 11, verticalAlign: "middle",
};