"use client";

/**
 * FILE: app/admin/pricing/page.tsx
 * 🔥 MOBILE-FIRST REBUILD — Karabo Pricing Manager
 *
 * LAYOUT: Card-based list replaces the wide table.
 *         Works on Android phones without horizontal scrolling.
 *         All business logic is identical to the previous version.
 *
 * RULES (unchanged):
 *  ✦ A product is "Priced" only if priced through THIS tool OR manually marked.
 *  ✦ Products with existing DB prices are still "Unpriced" until admin acts here.
 *  ✦ Priced state is stored in localStorage per session (key: karabo_pricing_v1)
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { adminTokenStorage, calculatePrice, exchangeApi, pricingApi } from "@/lib/api";

// ⚠️  CRITICAL: All pricing endpoints go directly to FastAPI (not Next.js /api/ proxy).
// Using a relative /api/... URL routes to Next.js API routes which don't exist for these
// paths — causing 404. We must use the backend base URL from env.
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "";
import type { ProductListItem } from "@/lib/types";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
type PricingState = "unpriced" | "priced" | "modified" | "saving" | "saved" | "error";
type BatchRow = {
  product: ProductListItem;
  marketInr: string;
  result: ReturnType<typeof calculatePrice> | null;
  state: PricingState;
  toolPrice: number | null;
  isSelected: boolean;
  errorMsg?: string;
  imgErr?: boolean;
};
type SortKey = "default" | "name" | "price_asc" | "price_desc" | "unpriced_first";
type FilterTab = "all" | "unpriced" | "priced";
type MainTab = "batch" | "calc";

/* ═══════════════════════════════════════════════════
   LOCAL STORAGE — fast cache only, DB is the source of truth
   IDs written here are synced to DB on every save/mark action.
   On load, DB is_priced wins; localStorage is a fallback.
═══════════════════════════════════════════════════ */
const STORAGE_KEY = "karabo_pricing_v1";
function loadCachedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}
function addToCache(id: string) {
  try {
    const ids = loadCachedIds(); ids.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}
function removeFromCache(id: string) {
  try {
    const ids = loadCachedIds(); ids.delete(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

/* ═══════════════════════════════════════════════════
   SESSION PERSISTENCE
   Saves the admin's in-progress work so they can
   continue exactly where they left off on next visit.
   Stores: per-product INR inputs, scroll position,
   active tab, filter tab, sort key, rate override.
═══════════════════════════════════════════════════ */
const SESSION_KEY = "karabo_pricing_session_v1";

type SessionData = {
  inputs:       Record<string, string>;   // productId → marketInr value
  scrollTop:    number;
  filterTab:    string;
  sortKey:      string;
  rateOverride: string;
  savedAt:      number;                   // unix ms — ignore sessions > 7 days old
};

function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d: SessionData = JSON.parse(raw);
    // Expire sessions older than 7 days
    if (Date.now() - (d.savedAt ?? 0) > 7 * 24 * 60 * 60 * 1000) return null;
    return d;
  } catch { return null; }
}

function saveSession(data: Partial<SessionData>) {
  try {
    const prev = loadSession() ?? {} as SessionData;
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...prev,
      ...data,
      savedAt: Date.now(),
    }));
  } catch {}
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}
const marginPct = (r: ReturnType<typeof calculatePrice>) =>
  parseFloat(((r.profit_inr * r.exchange_rate / r.final_price_lsl) * 100).toFixed(1));

const marginColor = (r: ReturnType<typeof calculatePrice> | null): string => {
  if (!r) return "#d1d5db";
  const m = marginPct(r);
  if (m < 8) return "#dc2626";
  if (m < 15) return "#d97706";
  return "#0f3f2f";
};

const fmt = (n: number, dec = 2) => n.toFixed(dec);

/* ═══════════════════════════════════════════════════
   BADGE COMPONENT
═══════════════════════════════════════════════════ */
function PricingBadge({ state }: { state: PricingState }) {
  const map: Record<PricingState, { label: string; bg: string; color: string; dot: string }> = {
    unpriced: { label: "Unpriced",  bg: "#fef3c7", color: "#92400e", dot: "#d97706" },
    priced:   { label: "Priced",    bg: "#dcfce7", color: "#14532d", dot: "#0f3f2f" },
    modified: { label: "Modified",  bg: "#dbeafe", color: "#1e3a8a", dot: "#2563eb" },
    saving:   { label: "Saving…",   bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" },
    saved:    { label: "✓ Saved",   bg: "#dcfce7", color: "#14532d", dot: "#0f3f2f" },
    error:    { label: "Error",     bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
  };
  const s = map[state];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function AdminPricingPage() {

  const [rate, setRate]               = useState(0.21);
  const [rateSrc, setRateSrc]         = useState<"live" | "fallback">("fallback");
  const [rateLoading, setRateLoading] = useState(true);

  // ── Restore session state immediately (before first render) ──────────────
  const _session = typeof window !== "undefined" ? loadSession() : null;

  const [rateOverride, setOverride]   = useState(_session?.rateOverride ?? "");
  const effectiveRate = rateOverride ? (parseFloat(rateOverride) || rate) : rate;

  useEffect(() => {
    exchangeApi.getINRtoLSL()
      .then(({ rate: r, source }) => { setRate(r); setRateSrc(source); })
      .finally(() => setRateLoading(false));
  }, []);

  const [rows, setRows]               = useState<BatchRow[]>([]);
  const [batchLoading, setBatch]      = useState(false);
  const [bulkSaving, setBulkSaving]   = useState(false);
  const [searchQ, setSearchQ]         = useState("");
  const [catFilter, setCat]           = useState("");
  const [brandFilter, setBrand]       = useState("");
  const [sortKey, setSort]            = useState<SortKey>((_session?.sortKey as SortKey) ?? "unpriced_first");
  const [filterTab, setFilterTab]     = useState<FilterTab>((_session?.filterTab as FilterTab) ?? "all");
  const [quickFillInr, setFill]       = useState("");
  const [selectAll, setSelectAll]     = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean; undo?: () => void } | null>(null);
  const [totalCount, setTotal]        = useState(0);
  const [mainTab, setMainTab]         = useState<MainTab>("batch");
  const [qMarket, setQMarket]         = useState("");
  const [highlightUnpriced, setHL]    = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);  // flag so scroll only fires once
  const [copiedId, setCopiedId]       = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set()); // collapsed priced cards
  const [loadedAt, setLoadedAt]       = useState<number | null>(null);    // stale data banner
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef  = useRef<HTMLDivElement>(null);  // ref on the pm-body scrollable div
  const inputRefs  = useRef<Map<string, HTMLInputElement>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist filter/sort/rate changes to session ───────────────────────────
  useEffect(() => { saveSession({ filterTab }); }, [filterTab]);
  useEffect(() => { saveSession({ sortKey });   }, [sortKey]);
  useEffect(() => { saveSession({ rateOverride }); }, [rateOverride]);

  // ── Debounced live search (400ms) ─────────────────────────────────────────
  useEffect(() => {
    if (!searchQ && rows.length === 0) return;  // don't auto-fire on mount
    const t = setTimeout(() => { if (rows.length > 0 || searchQ) loadProducts(); }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ]);

  // ── Global Ctrl+S / Cmd+S — save focused product ─────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== "s") return;
      e.preventDefault();
      // Find the product whose input is currently focused
      for (const [id, el] of inputRefs.current.entries()) {
        if (document.activeElement === el) {
          saveRow(id);
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // ── Save scroll position continuously ────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    saveSession({ scrollTop: el.scrollTop });
  }, []);

  const qVal    = parseFloat(qMarket) || 0;
  const qResult = qVal > 0 ? calculatePrice({ market_price_inr: qVal, exchange_rate: effectiveRate }) : null;

  const showToast = useCallback((msg: string, ok = true, undo?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, ok, undo });
    toastTimerRef.current = setTimeout(() => setToast(null), undo ? 4800 : 3500);
  }, []);

  const categories = useMemo(() =>
    [...new Set(rows.map(r => r.product.category).filter(Boolean))].sort() as string[], [rows]);
  const brands = useMemo(() =>
    [...new Set(rows.map(r => r.product.brand).filter(Boolean))].sort() as string[], [rows]);

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
    // Margin health for distribution bar
    const withMargin    = rows.filter(r => r.result);
    const marginLow     = withMargin.filter(r => marginPct(r.result!) < 8).length;
    const marginMid     = withMargin.filter(r => { const m = marginPct(r.result!); return m >= 8 && m < 15; }).length;
    const marginGood    = withMargin.filter(r => marginPct(r.result!) >= 15).length;
    return { total, unpriced, priced, modified, errors, withResult, readyToSave, pctDone, selectedReady, marginLow, marginMid, marginGood, withMargin: withMargin.length };
  }, [rows]);

  const loadProducts = useCallback(async () => {
    setBatch(true);
    try {
      const params: Record<string, any> = {};
      if (searchQ)     params.search   = searchQ;
      if (catFilter)   params.category = catFilter;
      if (brandFilter) params.brand    = brandFilter;

      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${BACKEND}/api/products/admin/pricing/all${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${adminTokenStorage.get() ?? ""}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      const products: ProductListItem[] = data.results ?? [];
      setTotal(data.total ?? products.length);

      const cachedIds     = loadCachedIds();
      const session       = loadSession();
      const savedInputs   = session?.inputs ?? {};   // ← restored INR values

      setRows(products.map((p: any) => {
        const isPriced    = p.is_priced || cachedIds.has(p.id);
        const savedInr    = savedInputs[p.id] ?? "";
        const v           = parseFloat(savedInr);
        const result      = (!isNaN(v) && v > 0)
          ? calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate })
          : null;
        // State: if DB says priced → priced; if we have a saved INR → modified; else unpriced
        const state: PricingState = isPriced
          ? "priced"
          : result
            ? "modified"
            : "unpriced";
        return {
          product:    p as ProductListItem,
          marketInr:  savedInr,
          result,
          state,
          toolPrice:  isPriced ? (p.price ?? null) : null,
          isSelected: false,
        };
      }));
      // Auto-expand all non-priced cards; collapse already-priced ones
      setExpandedIds(prev => {
        const next = new Set(prev);
        products.forEach((p: any) => {
          const isPriced = p.is_priced || cachedIds.has(p.id);
          if (!isPriced) next.add(p.id);
        });
        return next;
      });
      setLoadedAt(Date.now());
      setSelectAll(false);
      setSessionRestored(true);   // triggers scroll restore effect below
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load products", false);
    } finally {
      setBatch(false);
    }
  }, [searchQ, catFilter, brandFilter, showToast, effectiveRate]);

  // ── Restore scroll position after rows are painted ───────────────────────
  useEffect(() => {
    if (!sessionRestored || !scrollRef.current) return;
    const session = loadSession();
    if (session?.scrollTop) {
      // Small delay so the DOM has finished rendering all cards
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ top: session.scrollTop, behavior: "instant" });
      }, 80);
      return () => clearTimeout(t);
    }
    setSessionRestored(false);
  }, [sessionRestored]);

  useEffect(() => {
    setRows(prev => prev.map(row => {
      const v = parseFloat(row.marketInr);
      if (!isNaN(v) && v > 0)
        return { ...row, result: calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate }) };
      return row;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRate]);

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

  const updateRow = (id: string, val: string) => {
    setRows(prev => prev.map(row => {
      if (row.product.id !== id) return row;
      const v = parseFloat(val);
      const result = (!isNaN(v) && v > 0) ? calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate }) : null;
      const wasToolPriced = loadCachedIds().has(id);
      const newState: PricingState = result ? "modified"
        : wasToolPriced ? "priced" : "unpriced";
      return { ...row, marketInr: val, result, state: newState };
    }));

    // Debounce-save all inputs to session (100 ms after last keystroke)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setRows(current => {
        const inputs: Record<string, string> = {};
        current.forEach(r => { if (r.marketInr) inputs[r.product.id] = r.marketInr; });
        saveSession({ inputs });
        return current;  // no state change, just side-effect
      });
    }, 100);
  };

  const setImgErr = (id: string) =>
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, imgErr: true } : r));

  // ── Auto-save on blur (1.2s delay) ───────────────────────────────────────
  const autoSaveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const handleInputBlur = useCallback((id: string) => {
    const existing = autoSaveTimerRef.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setRows(current => {
        const row = current.find(r => r.product.id === id);
        if (row?.result && row.state === "modified") {
          saveRow(id);
        }
        return current;
      });
    }, 1200);
    autoSaveTimerRef.current.set(id, t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // ── Export CSV ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = ["Title","Brand","Category","Market INR","Final M","Compare M","Margin %","Status"];
    const csvRows = [headers.join(",")];
    rows.forEach(r => {
      const mPctVal = r.result ? marginPct(r.result) : "";
      const row = [
        `"${r.product.title.replace(/"/g, '""')}"`,
        `"${r.product.brand ?? ""}"`,
        `"${r.product.category ?? ""}"`,
        r.marketInr || "",
        r.result ? fmt(r.result.final_price_lsl) : "",
        r.result ? fmt(r.result.compare_price_lsl) : "",
        mPctVal,
        r.state,
      ];
      csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `pricing-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} products to CSV`);
  };

  const copyTitle = (id: string, title: string) => {
    navigator.clipboard.writeText(title).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(prev => prev === id ? null : prev), 1800);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = title;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(prev => prev === id ? null : prev), 1800);
    });
  };

  const markAsPriced = async (id: string) => {
    addToCache(id);
    const session = loadSession();
    if (session?.inputs?.[id]) {
      const inputs = { ...session.inputs };
      delete inputs[id];
      saveSession({ inputs });
    }
    setRows(prev => prev.map(r =>
      r.product.id === id ? { ...r, state: "priced", marketInr: "", result: null, toolPrice: r.product.price ?? null } : r
    ));
    // Collapse the card when marked priced
    setExpandedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    showToast("Marked as priced", true, () => markAsUnpriced(id));
    try {
      await fetch(`${BACKEND}/api/products/admin/pricing/${id}/mark`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminTokenStorage.get() ?? ""}`,
        },
        body: JSON.stringify({ is_priced: true }),
      });
    } catch { /* cache still covers it */ }
  };

  const markAsUnpriced = async (id: string) => {
    removeFromCache(id);
    setRows(prev => prev.map(r =>
      r.product.id === id ? { ...r, state: "unpriced", toolPrice: null, marketInr: "", result: null } : r
    ));
    setExpandedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    showToast("Reset to unpriced", false);
    try {
      await fetch(`${BACKEND}/api/products/admin/pricing/${id}/mark`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminTokenStorage.get() ?? ""}`,
        },
        body: JSON.stringify({ is_priced: false }),
      });
    } catch { /* non-critical */ }
  };

  const applyQuickFill = () => {
    const v = parseFloat(quickFillInr);
    if (isNaN(v) || v <= 0) return;
    const result = calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate });
    // Only apply to unpriced rows that are visible in the current filter/category view
    const visibleUnpricedIds = new Set(
      displayRows.filter(r => r.state === "unpriced").map(r => r.product.id)
    );
    let count = 0;
    setRows(prev => prev.map(row => {
      if (!visibleUnpricedIds.has(row.product.id)) return row;
      count++;
      return { ...row, marketInr: String(v), result, state: "modified" };
    }));
    const scope = (catFilter || brandFilter) ? " (filtered)" : "";
    showToast(`Applied ₹${v.toLocaleString()} to ${count} unpriced products${scope}`);
    setFill("");
  };

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setRows(prev => prev.map(r => ({ ...r, isSelected: next })));
  };
  const toggleRow = (id: string) =>
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, isSelected: !r.isSelected } : r));

  const saveRow = async (id: string) => {
    const row = rows.find(r => r.product.id === id);
    if (!row?.result) return;
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, state: "saving" } : r));
    try {
      await pricingApi.applyToProduct(id, row.result.final_price_lsl, row.result.compare_price_lsl);
      addToCache(id);
      const session = loadSession();
      if (session?.inputs?.[id]) {
        const inputs = { ...session.inputs };
        delete inputs[id];
        saveSession({ inputs });
      }
      fetch(`${BACKEND}/api/products/admin/pricing/${id}/mark`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminTokenStorage.get() ?? ""}`,
        },
        body: JSON.stringify({ is_priced: true }),
      }).catch(() => {});
      setRows(prev => prev.map(r =>
        r.product.id === id ? { ...r, state: "saved", toolPrice: r.result?.final_price_lsl ?? r.toolPrice } : r
      ));
      // Collapse card after save
      setExpandedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      showToast(`Price saved — M ${fmt(row.result.final_price_lsl)}`, true, () => markAsUnpriced(id));
    } catch (e: any) {
      setRows(prev => prev.map(r =>
        r.product.id === id ? { ...r, state: "error", errorMsg: e?.message } : r
      ));
    }
  };

  const saveAll = async (selectedOnly = false) => {
    const toSave = rows.filter(r =>
      r.result && r.state !== "saved" && r.state !== "saving" && r.state !== "priced" &&
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

    // Determine which succeeded
    const succeededIds = toSave
      .filter(r => !res.errors.some((e: string) => e.startsWith(r.product.id)))
      .map(r => r.product.id);

    // Update local cache
    succeededIds.forEach(id => addToCache(id));

    // Clear saved inputs for successfully priced products
    if (succeededIds.length > 0) {
      const session = loadSession();
      if (session?.inputs) {
        const inputs = { ...session.inputs };
        succeededIds.forEach(id => delete inputs[id]);
        saveSession({ inputs });
      }
    }

    // Bulk-mark in DB (fire and forget — cache covers it)
    if (succeededIds.length > 0) {
      fetch(`${BACKEND}/api/products/admin/pricing/bulk-mark`, {  // eslint-disable-line
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminTokenStorage.get() ?? ""}`,
        },
        body: JSON.stringify({ product_ids: succeededIds, is_priced: true }),
      }).catch(() => {/* non-critical */});
    }

    setRows(prev => prev.map(r => {
      const wasSaving = toSave.some(t => t.product.id === r.product.id);
      if (!wasSaving) return r;
      const failed = res.errors.some((e: string) => e.startsWith(r.product.id));
      return { ...r, state: failed ? "error" : "saved", toolPrice: failed ? r.toolPrice : (r.result?.final_price_lsl ?? r.toolPrice) };
    }));
    setBulkSaving(false);
    showToast(`${res.success} prices saved${res.failed ? `, ${res.failed} failed` : ""}`, res.failed === 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentId: string) => {
    if (e.key !== "Tab" && e.key !== "Enter") return;
    e.preventDefault();
    const ids = displayRows.map(r => r.product.id);
    const nextId = ids[ids.indexOf(currentId) + 1];
    if (nextId) inputRefs.current.get(nextId)?.focus();
  };

  /* ════════════════ RENDER ════════════════ */
  return (
    <>
      <style>{`
        @keyframes toastSlide  { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer     { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes spin        { to{transform:rotate(360deg)} }
        @keyframes fadeUp      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown   { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

        .pm * { box-sizing:border-box; }
        .pm {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #f8f9fa;
          color: #111;
        }

        /* ── CHROME (top bar) ── */
        .pm-chrome {
          flex-shrink: 0;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .pm-chrome-row1 {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          flex-wrap: wrap;
        }
        .pm-chrome-row2 {
          padding: 0 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ── SCROLLABLE BODY ── */
        .pm-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          padding: 12px 12px 80px;
        }

        /* ── TAB BUTTON ── */
        .pm-tab {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          border: 1.5px solid transparent;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .pm-tab-active  { background: #0f3f2f; color: white; border-color: #0f3f2f; }
        .pm-tab-inactive{ background: white; color: #6b7280; border-color: #e5e7eb; }
        .pm-tab-inactive:hover { border-color: #0f3f2f; color: #0f3f2f; }

        /* ── FILTER PILL ── */
        .pm-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          border: 1.5px solid transparent;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }

        /* ── INPUTS & SELECTS ── */
        .pm-input {
          padding: 9px 12px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          font-family: inherit;
          background: white;
          color: #111;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          min-height: 40px;
          width: 100%;
        }
        .pm-input:focus { border-color: #0f3f2f; box-shadow: 0 0 0 3px rgba(15,63,47,0.1); }
        .pm-input::placeholder { color: #9ca3af; }
        .pm-select {
          padding: 9px 28px 9px 10px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          font-family: inherit;
          background: white;
          color: #374151;
          outline: none;
          appearance: none;
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 9px center;
          min-height: 40px;
          transition: border-color 0.15s;
        }
        .pm-select:focus { border-color: #0f3f2f; outline: none; }

        /* ── BUTTONS ── */
        .pm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          white-space: nowrap;
          min-height: 40px;
        }
        .pm-btn:active:not(:disabled) { transform: scale(0.97); }
        .pm-btn-primary  { background: #0f3f2f; color: white; box-shadow: 0 2px 6px rgba(15,63,47,0.2); }
        .pm-btn-primary:hover:not(:disabled) { background: #1b5e4a; box-shadow: 0 4px 14px rgba(15,63,47,0.3); }
        .pm-btn-primary:disabled { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: not-allowed; }
        .pm-btn-gold { background: #c8a75a; color: white; box-shadow: 0 2px 6px rgba(200,167,90,0.3); }
        .pm-btn-gold:hover:not(:disabled) { background: #b8973e; }
        .pm-btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }
        .pm-btn-ghost { background: white; color: #374151; border: 1.5px solid #e5e7eb; }
        .pm-btn-ghost:hover:not(:disabled) { border-color: #0f3f2f; color: #0f3f2f; }
        .pm-btn-blue { background: #2563eb; color: white; }
        .pm-btn-blue:disabled { opacity: 0.5; cursor: not-allowed; }
        .pm-btn-danger { background: #fee2e2; color: #991b1b; border: 1.5px solid #fca5a5; }
        .pm-btn-sm { padding: 6px 13px; font-size: 12px; min-height: 34px; }
        .pm-btn-xs { padding: 4px 10px; font-size: 11px; min-height: 30px; border-radius: 6px; }
        .pm-btn-block { width: 100%; }

        /* ── PRODUCT CARD ── */
        .pc {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          animation: fadeUp 0.3s ease both;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pc:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

        .pc-state-bar { height: 3px; width: 100%; }

        .pc-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px 10px;
        }
        .pc-thumb {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #f3f4f6;
          background: #f9fafb;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .pc-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pc-info { flex: 1; min-width: 0; }
        .pc-title-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin-bottom: 4px;
        }
        .pc-title {
          font-size: 13px; font-weight: 700; color: #111; line-height: 1.35;
          /* No line-clamp: full title must be visible and copy-paste friendly */
          word-break: break-word;
          user-select: text;
          -webkit-user-select: text;
          flex: 1;
        }
        .pc-copy-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 5px;
          border: 1.5px solid #e5e7eb;
          background: white;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
          margin-top: 1px;
        }
        .pc-copy-btn:hover { border-color: #0f3f2f; color: #0f3f2f; background: rgba(15,63,47,0.05); }
        .pc-copy-btn-done { border-color: #16a34a !important; color: #16a34a !important; background: rgba(22,163,74,0.08) !important; }
        .pc-meta { font-size: 11px; color: #9ca3af; margin-bottom: 5px; }
        .pc-badge-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .pc-dbprice {
          font-size: 12px; font-weight: 600; color: #6b7280;
        }
        .pc-sel-check { 
          width: 18px; height: 18px; flex-shrink: 0; 
          accent-color: #0f3f2f; cursor: pointer; margin-top: 2px;
        }

        /* ── INR INPUT SECTION ── */
        .pc-input-section {
          padding: 10px 14px;
          border-top: 1px solid #f3f4f6;
          background: #fafafa;
        }
        .pc-input-label {
          font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase;
          letter-spacing: 0.6px; margin-bottom: 7px;
        }
        .pc-inr-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .pc-rupee {
          position: absolute; left: 12px; font-size: 16px; font-weight: 700;
          color: #c8a75a; pointer-events: none; z-index: 1;
        }
        .pc-inr {
          width: 100%;
          padding: 11px 12px 11px 30px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 700;
          color: #111;
          background: white;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          min-height: 48px;
        }
        .pc-inr:focus { border-color: #c8a75a; box-shadow: 0 0 0 3px rgba(200,167,90,0.15); }
        .pc-inr:disabled { opacity: 0.4; cursor: not-allowed; }
        .pc-inr-active { border-color: #c8a75a !important; background: rgba(200,167,90,0.03) !important; }
        .pc-inr::placeholder { color: #d1d5db; font-weight: 400; font-size: 15px; }

        /* ── RESULTS SECTION ── */
        .pc-results {
          padding: 10px 14px;
          border-top: 1px solid #f3f4f6;
          background: rgba(15,63,47,0.02);
        }
        .pc-final-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pc-final-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
        .pc-final-price { font-size: 22px; font-weight: 900; color: #0f3f2f; letter-spacing: -0.5px; }
        .pc-stats-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .pc-stat-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(15,63,47,0.07);
          color: #0f3f2f;
        }
        .pc-compare-chip { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }
        .pc-margin-bar { height: 4px; border-radius: 3px; background: #e5e7eb; overflow: hidden; flex: 1; min-width: 60px; }
        .pc-margin-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

        /* ── ACTIONS SECTION ── */
        .pc-actions {
          padding: 10px 14px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pc-save-btn {
          flex: 1;
          min-width: 120px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 48px;
        }
        .pc-save-btn:active:not(:disabled) { transform: scale(0.97); }
        .pc-save-active { background: #0f3f2f; color: white; box-shadow: 0 4px 14px rgba(15,63,47,0.25); }
        .pc-save-active:hover { background: #1b5e4a; }
        .pc-save-disabled { background: #f3f4f6; color: #d1d5db; cursor: not-allowed; }
        .pc-save-saving { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }
        .pc-save-saved  { background: #dcfce7; color: #14532d; cursor: default; }
        .pc-save-error  { background: #fee2e2; color: #991b1b; }
        .pc-mark-btn {
          padding: 11px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .pc-mark-priced { background: #f0fdf4; color: #14532d; border: 1.5px solid #bbf7d0; }
        .pc-mark-priced:hover { background: #dcfce7; }
        .pc-mark-reset  { background: #fff7ed; color: #92400e; border: 1.5px solid #fed7aa; }
        .pc-mark-reset:hover  { background: #ffedd5; }

        /* ── SKELETON ── */
        .pc-sk {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 600px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }

        /* ── SPINNER ── */
        .pm-spin { animation: spin 0.8s linear infinite; display: inline-block; }

        /* ── PROGRESS BAR ── */
        .pm-progress-wrap { background: #f3f4f6; border-radius: 20px; height: 7px; overflow: hidden; }
        .pm-progress-fill { height: 100%; border-radius: 20px; transition: width 0.6s; }

        /* ── STICKY SAVE BAR ── */
        .pm-save-bar {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: white;
          border-top: 1.5px solid #e5e7eb;
          padding: 10px 14px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 9900;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.10);
          animation: fadeUp 0.25s ease;
        }
        .pm-save-pulse {
          width: 10px; height: 10px; border-radius: 50%; background: #c8a75a; flex-shrink: 0;
          box-shadow: 0 0 0 0 rgba(200,167,90,0.3);
          animation: pulse 2.5s infinite;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(200,167,90,0.3); }
          50%      { box-shadow: 0 0 0 6px rgba(200,167,90,0); }
        }

        /* ── CALC LAYOUT ── */
        .calc-grid { display: grid; gap: 16px; }
        @media (min-width: 640px) { .calc-grid { grid-template-columns: 1fr 1fr; } }

        /* ── STATS ROW ── */
        .pm-stats-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .pm-stat-box {
          flex: 1;
          min-width: 80px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 12px;
          text-align: center;
        }
        .pm-stat-val { font-size: 20px; font-weight: 900; line-height: 1; }
        .pm-stat-lbl { font-size: 10px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }

        /* ── FILTER DRAWER ── */
        .pm-filter-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: slideDown 0.2s ease;
        }
        .pm-filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

        /* ── SEARCH ROW ── */
        .pm-search-wrap { position: relative; flex: 1; min-width: 160px; }
        .pm-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .pm-search-input {
          width: 100%; padding: 10px 12px 10px 34px;
          border: 1.5px solid #e5e7eb; border-radius: 8px;
          font-size: 13px; font-family: inherit; background: white;
          color: #111; outline: none; min-height: 42px;
          transition: border-color 0.15s;
        }
        .pm-search-input:focus { border-color: #0f3f2f; }

        /* ── EMPTY STATE ── */
        .pm-empty {
          background: white;
          border: 2px dashed #e5e7eb;
          border-radius: 14px;
          padding: 40px 24px;
          text-align: center;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 480px) {
          .pc-final-price { font-size: 19px; }
          .pm-body { padding: 10px 10px 80px; }
        }
      `}</style>

      <div className="pm">

        {/* ─── TOAST ─── */}
        {toast && (
          <div style={{
            position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 99999,
            background: toast.ok ? "#0f3f2f" : "#dc2626", color: "white",
            padding: "11px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10,
            animation: "toastSlide 0.3s ease", whiteSpace: "nowrap", maxWidth: "90vw",
          }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center", fontSize: 11, flexShrink: 0 }}>
              {toast.ok ? "✓" : "✗"}
            </span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{toast.msg}</span>
            {toast.undo && (
              <button
                onClick={() => { toast.undo!(); setToast(null); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
                Undo
              </button>
            )}
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: "0 2px", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* ─── CHROME TOP BAR ─── */}
        <div className="pm-chrome">
          <div className="pm-chrome-row1">
            {/* Back */}
            <Link href="/admin" style={{ display: "flex", alignItems: "center", color: "#9ca3af", textDecoration: "none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M5 12l7 7M5 12l7-7"/></svg>
            </Link>

            {/* Icon + Title */}
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0f3f2f,#1b5e4a)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <span style={{ fontWeight: 900, fontSize: 16, color: "#111", letterSpacing: -0.3, flex: 1, minWidth: 0 }}>
              Pricing Manager
            </span>

            {/* Progress ring — shown once products are loaded */}
            {rows.length > 0 && (() => {
              const r = 10, circ = 2 * Math.PI * r;
              const dash = (stats.pctDone / 100) * circ;
              return (
                <div title={`${stats.pctDone}% priced`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
                  <svg width="30" height="30" viewBox="0 0 26 26">
                    <circle cx="13" cy="13" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="13" cy="13" r={r} fill="none" stroke={stats.pctDone === 100 ? "#16a34a" : "#0f3f2f"} strokeWidth="3"
                      strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                      transform="rotate(-90 13 13)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
                    <text x="13" y="17" textAnchor="middle" fontSize="7" fontWeight="800" fill={stats.pctDone === 100 ? "#16a34a" : "#0f3f2f"}>{stats.pctDone}%</text>
                  </svg>
                </div>
              );
            })()}

            {/* Tabs */}
            {([
              { id: "batch", label: `⚡ Batch${rows.length ? ` (${rows.length})` : ""}` },
              { id: "calc",  label: "🧮 Calc" },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id as MainTab)}
                className={`pm-tab ${mainTab === t.id ? "pm-tab-active" : "pm-tab-inactive"}`}
                style={{ padding: "6px 12px", fontSize: 12 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Row 2: rate + filter toggle */}
          <div className="pm-chrome-row2">
            {/* Rate row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: rateLoading ? "#d1d5db" : rateSrc === "live" ? "#16a34a" : "#d97706", flexShrink: 0 }} />
                {rateLoading ? "Loading rate…" : `1 ₹ = M ${effectiveRate.toFixed(4)}`}
                {rateOverride && <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(200,167,90,0.15)", color: "#c8a75a", padding: "1px 6px", borderRadius: 20 }}>OVERRIDE</span>}
              </div>
              <input type="number" placeholder="Override rate" value={rateOverride} onChange={e => setOverride(e.target.value)} step="0.0001"
                style={{ width: 120, padding: "5px 9px", border: "1.5px solid #e5e7eb", borderRadius: 7, fontSize: 12, fontFamily: "inherit", outline: "none", background: "white", minHeight: "unset" }} />
              {rateOverride && <button onClick={() => setOverride("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", lineHeight: 1, padding: "2px 4px" }}>✕</button>}
            </div>

            {/* Batch-mode toolbar */}
            {mainTab === "batch" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {/* Search */}
                <div className="pm-search-wrap">
                  <span className="pm-search-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </span>
                  <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadProducts()}
                    placeholder="Search products…" className="pm-search-input" />
                </div>

                <button onClick={() => loadProducts()} disabled={batchLoading} className="pm-btn pm-btn-primary pm-btn-sm" style={{ flexShrink: 0 }}>
                  {batchLoading
                    ? <><span className="pm-spin" style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} /></>
                    : rows.length > 0 ? "🔄 Reload" : "⚡ Load"}
                </button>

                {rows.length > 0 && (
                  <button onClick={exportCsv} className="pm-btn pm-btn-ghost pm-btn-sm" style={{ flexShrink: 0 }} title="Export all rows to CSV">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    CSV
                  </button>
                )}

                <button onClick={() => setShowFilters(!showFilters)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${showFilters ? "#0f3f2f" : "#e5e7eb"}`, background: showFilters ? "rgba(15,63,47,0.06)" : "white", color: showFilters ? "#0f3f2f" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, minHeight: 38 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                  Filters
                  {(catFilter || brandFilter) && <span style={{ background: "#0f3f2f", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "grid", placeItems: "center", fontWeight: 800 }}>!</span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── SCROLLABLE BODY ─── */}
        <div ref={scrollRef} onScroll={handleScroll} className="pm-body">

          {/* ── FILTER PANEL (collapsible) ── */}
          {mainTab === "batch" && showFilters && (
            <div className="pm-filter-panel">
              <div className="pm-filter-row">
                <select value={catFilter} onChange={e => setCat(e.target.value)} className="pm-select" style={{ flex: 1, minWidth: 120 }}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={brandFilter} onChange={e => setBrand(e.target.value)} className="pm-select" style={{ flex: 1, minWidth: 120 }}>
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {rows.length > 0 && stats.unpriced > 0 && (
                <div className="pm-filter-row" style={{ background: "#fffbeb", padding: "10px 12px", borderRadius: 8, border: "1px solid #fde68a" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", flexShrink: 0 }}>⚡ Quick Fill:</span>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "#c8a75a", pointerEvents: "none" }}>₹</span>
                    <input type="number" value={quickFillInr} onChange={e => setFill(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && applyQuickFill()}
                      placeholder="Price for all unpriced"
                      style={{ width: "100%", padding: "8px 10px 8px 24px", border: "1.5px solid #fde68a", borderRadius: 7, fontSize: 14, fontWeight: 700, fontFamily: "inherit", outline: "none", background: "white", minHeight: "unset" }} />
                  </div>
                  <button onClick={applyQuickFill} disabled={!quickFillInr} className="pm-btn pm-btn-gold pm-btn-sm" style={{ flexShrink: 0 }}>Apply All</button>
                </div>
              )}
              {(catFilter || brandFilter) && (
                <button onClick={() => { setCat(""); setBrand(""); }} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  ✕ Clear filters
                </button>
              )}
            </div>
          )}

          {/* ── CALCULATOR TAB ── */}
          {mainTab === "calc" && (
            <div className="calc-grid">
              {/* Input */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(200,167,90,0.12)", display: "grid", placeItems: "center", fontSize: 20 }}>₹</div>
                  Market Price (INR)
                </div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: 8 }}>
                  Enter Price (₹) <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 22, fontWeight: 700, color: "#c8a75a", pointerEvents: "none" }}>₹</span>
                  <input type="number" value={qMarket} onChange={e => setQMarket(e.target.value)} placeholder="2499" autoFocus
                    style={{ width: "100%", padding: "14px 16px 14px 42px", border: `2px solid ${qResult ? "#c8a75a" : "#e5e7eb"}`, borderRadius: 10, fontSize: 28, fontWeight: 900, color: "#111", outline: "none", fontFamily: "inherit", background: qResult ? "rgba(200,167,90,0.03)" : "white", transition: "border-color 0.2s", minHeight: "unset" }} />
                </div>
                <div style={{ background: "#f9fafb", borderRadius: 9, border: "1px solid #e5e7eb", padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>Applied automatically</div>
                  {[["🚚 Shipping", "₹700 fixed"], ["💼 Profit", "₹500 fixed"], ["💱 Exchange", `M ${effectiveRate.toFixed(5)}`]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #e5e7eb", fontSize: 13 }}>
                      <span style={{ color: "#6b7280" }}>{k}</span>
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Result */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {qResult ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>Price Breakdown</div>
                    {[["Market", `₹ ${qVal.toLocaleString()}`, "#111"], ["+ Shipping", `₹ ${qResult.shipping_cost_inr}`, "#6b7280"], ["+ Profit", `₹ ${qResult.profit_inr}`, "#6b7280"]].map(([k, v, c]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 }}>
                        <span style={{ color: "#6b7280" }}>{k}</span>
                        <span style={{ fontWeight: 700, color: c as string }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 14px", fontSize: 14, borderBottom: "2px solid #111" }}>
                      <span style={{ fontWeight: 700 }}>Total (INR)</span>
                      <span style={{ fontWeight: 900 }}>₹ {qResult.total_cost_inr.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: "#9ca3af" }}>
                      <span>× Exchange Rate</span>
                      <span style={{ fontWeight: 700 }}>× {effectiveRate.toFixed(5)}</span>
                    </div>
                    <div style={{ marginTop: 14, background: "linear-gradient(135deg, rgba(15,63,47,0.06), rgba(15,63,47,0.02))", border: "2px solid rgba(15,63,47,0.15)", borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>FINAL PRICE (MALOTI)</div>
                      <div style={{ fontSize: 38, fontWeight: 900, color: "#0f3f2f", letterSpacing: -1.5, lineHeight: 1.1 }}>M {fmt(qResult.final_price_lsl)}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "#9ca3af", textDecoration: "line-through" }}>M {fmt(qResult.compare_price_lsl)}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, background: "rgba(15,63,47,0.08)", borderRadius: 20, padding: "5px 14px", fontSize: 13, color: "#0f3f2f" }}>
                        <span style={{ fontWeight: 800 }}>{qResult.discount_pct}% off</span>
                        <span style={{ opacity: 0.65 }}>· saves M {fmt(qResult.savings_lsl)}</span>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: marginColor(qResult) }}>
                        Margin: {marginPct(qResult)}%{marginPct(qResult) < 8 ? " ⚠ Too low" : marginPct(qResult) < 15 ? " — Acceptable" : " ✓ Healthy"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ height: "100%", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 16, background: "#f9fafb", border: "1px solid #e5e7eb", display: "grid", placeItems: "center" }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <p style={{ fontSize: 14, color: "#9ca3af", margin: 0, maxWidth: 240 }}>Enter a market price to calculate the Maloti selling price</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BATCH TAB ── */}
          {mainTab === "batch" && (
            <>
              {/* Stale data banner */}
              {loadedAt && rows.length > 0 && (Date.now() - loadedAt) > 30 * 60 * 1000 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, marginBottom: 10, fontSize: 12, fontWeight: 600, color: "#92400e" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  <span style={{ flex: 1 }}>
                    Loaded {Math.round((Date.now() - loadedAt) / 60000)} min ago — prices may have changed
                  </span>
                  <button onClick={() => loadProducts()} className="pm-btn pm-btn-ghost pm-btn-sm" style={{ minHeight: 28, padding: "4px 10px" }}>Reload</button>
                </div>
              )}
              {/* Empty state */}
              {rows.length === 0 && !batchLoading && (
                <div className="pm-empty">
                  <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px", background: "linear-gradient(135deg, rgba(15,63,47,0.08), rgba(200,167,90,0.1))", display: "grid", placeItems: "center" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0f3f2f" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                    </svg>
                  </div>

                  {/* ── Resume banner — shown when a previous session exists ── */}
                  {(() => {
                    const session = loadSession();
                    const inputCount = Object.keys(session?.inputs ?? {}).length;
                    if (!session || inputCount === 0) return null;
                    const ago = Math.round((Date.now() - session.savedAt) / 60000);
                    const agoStr = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago/60)}h ago` : `${Math.round(ago/1440)}d ago`;
                    return (
                      <div style={{ background: "linear-gradient(135deg,rgba(200,167,90,0.1),rgba(15,63,47,0.06))", border: "1.5px solid rgba(200,167,90,0.35)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>⏱</span>
                          <span style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>Resume previous session</span>
                          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>{agoStr}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
                          You had <strong>{inputCount} price{inputCount !== 1 ? "s" : ""} in progress</strong>. Load products to pick up where you left off.
                        </p>
                        <button onClick={() => { clearSession(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af", textDecoration: "underline", padding: 0, fontFamily: "inherit" }}>
                          Start fresh instead
                        </button>
                      </div>
                    );
                  })()}

                  <div style={{ fontSize: 18, fontWeight: 900, color: "#111", marginBottom: 8 }}>Ready to price your catalog</div>
                  <p style={{ fontSize: 13, color: "#9ca3af", maxWidth: 360, margin: "0 auto 20px" }}>
                    All products load as <strong>Unpriced</strong>. Priced products and your in-progress inputs are remembered automatically.
                  </p>
                  <button onClick={() => loadProducts()} className="pm-btn pm-btn-primary" style={{ padding: "13px 32px", fontSize: 14 }}>⚡ Load Products</button>
                </div>
              )}

              {/* Skeleton */}
              {batchLoading && rows.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 14, opacity: 1 - i * 0.15 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                        <div className="pc-sk" style={{ width: 52, height: 52, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div className="pc-sk" style={{ width: "70%", height: 13, marginBottom: 8 }} />
                          <div className="pc-sk" style={{ width: "40%", height: 10 }} />
                        </div>
                      </div>
                      <div className="pc-sk" style={{ width: "100%", height: 48 }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Stats + filters row */}
              {rows.length > 0 && (
                <>
                  {/* Stats */}
                  <div className="pm-stats-row">
                    <div className="pm-stat-box" style={{ borderLeft: "3px solid #d97706" }}>
                      <div className="pm-stat-val" style={{ color: "#d97706" }}>{stats.unpriced}</div>
                      <div className="pm-stat-lbl">Unpriced</div>
                    </div>
                    <div className="pm-stat-box" style={{ borderLeft: "3px solid #0f3f2f" }}>
                      <div className="pm-stat-val" style={{ color: "#0f3f2f" }}>{stats.priced}</div>
                      <div className="pm-stat-lbl">Priced</div>
                    </div>
                    <div className="pm-stat-box" style={{ borderLeft: "3px solid #2563eb" }}>
                      <div className="pm-stat-val" style={{ color: "#2563eb" }}>{stats.modified}</div>
                      <div className="pm-stat-lbl">Modified</div>
                    </div>
                    {stats.errors > 0 && (
                      <div className="pm-stat-box" style={{ borderLeft: "3px solid #dc2626" }}>
                        <div className="pm-stat-val" style={{ color: "#dc2626" }}>{stats.errors}</div>
                        <div className="pm-stat-lbl">Errors</div>
                      </div>
                    )}
                  </div>

                  {/* Margin distribution bar */}
                  {stats.withMargin > 0 && (
                    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px" }}>Margin Health — {stats.withMargin} calculated</span>
                      </div>
                      <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", gap: 2 }}>
                        {stats.marginLow  > 0 && <div title={`${stats.marginLow} low (<8%)`}  style={{ flex: stats.marginLow,  background: "#dc2626", borderRadius: 4, transition: "flex 0.5s" }} />}
                        {stats.marginMid  > 0 && <div title={`${stats.marginMid} ok (8-15%)`} style={{ flex: stats.marginMid,  background: "#d97706", borderRadius: 4, transition: "flex 0.5s" }} />}
                        {stats.marginGood > 0 && <div title={`${stats.marginGood} healthy (>15%)`} style={{ flex: stats.marginGood, background: "#16a34a", borderRadius: 4, transition: "flex 0.5s" }} />}
                      </div>
                      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                        {[
                          { label: "Low <8%",      val: stats.marginLow,  color: "#dc2626" },
                          { label: "OK 8–15%",     val: stats.marginMid,  color: "#d97706" },
                          { label: "Healthy >15%", val: stats.marginGood, color: "#16a34a" },
                        ].filter(x => x.val > 0).map(x => (
                          <span key={x.label} style={{ fontSize: 11, fontWeight: 700, color: x.color, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: x.color, flexShrink: 0 }} />
                            {x.val} {x.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Progress */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 5 }}>
                      <span>Pricing progress</span>
                      <span style={{ color: stats.pctDone === 100 ? "#0f3f2f" : "#d97706" }}>{stats.pctDone}% done · {stats.priced}/{stats.total}</span>
                    </div>
                    <div className="pm-progress-wrap">
                      <div className="pm-progress-fill" style={{ width: `${stats.pctDone}%`, background: stats.pctDone === 100 ? "#0f3f2f" : "#d97706" }} />
                    </div>
                  </div>

                  {/* Filter + sort toolbar */}
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                    {/* Filter tabs */}
                    {([
                      { id: "all",      label: "All",         count: rows.length,                                     bg: "#111",    fg: "white" },
                      { id: "unpriced", label: "⚠ Unpriced",  count: stats.unpriced + stats.modified + stats.errors,  bg: "#d97706", fg: "white" },
                      { id: "priced",   label: "✓ Priced",    count: stats.priced,                                     bg: "#0f3f2f", fg: "white" },
                    ] as const).map(t => {
                      const active = filterTab === t.id;
                      return (
                        <button key={t.id} onClick={() => setFilterTab(t.id)} className="pm-pill"
                          style={{ background: active ? t.bg : "white", color: active ? t.fg : "#6b7280", border: `1.5px solid ${active ? "transparent" : "#e5e7eb"}` }}>
                          {t.label}
                          <span style={{ background: active ? "rgba(255,255,255,0.2)" : "#f3f4f6", color: active ? "white" : "#6b7280", padding: "0 5px", borderRadius: 20, fontSize: 10, fontWeight: 800 }}>{t.count}</span>
                        </button>
                      );
                    })}

                    {/* Divider */}
                    <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0 }} />

                    {/* Sort */}
                    <select value={sortKey} onChange={e => setSort(e.target.value as SortKey)} className="pm-select" style={{ fontSize: 12, minHeight: 36, flex: 1, minWidth: 120 }}>
                      <option value="unpriced_first">⚠ Unpriced first</option>
                      <option value="default">Default order</option>
                      <option value="name">A–Z</option>
                      <option value="price_asc">Price: Low → High</option>
                      <option value="price_desc">Price: High → Low</option>
                    </select>

                    {/* Select all */}
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#6b7280", cursor: "pointer", userSelect: "none", flexShrink: 0 }}>
                      <input type="checkbox" checked={selectAll} onChange={toggleSelectAll}
                        style={{ accentColor: "#0f3f2f", width: 15, height: 15, cursor: "pointer" }} />
                      All
                    </label>

                    {/* Highlight toggle */}
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#6b7280", cursor: "pointer", userSelect: "none", flexShrink: 0 }}>
                      <input type="checkbox" checked={highlightUnpriced} onChange={e => setHL(e.target.checked)}
                        style={{ accentColor: "#0f3f2f", width: 15, height: 15, cursor: "pointer" }} />
                      Highlight
                    </label>

                    {/* Save selected */}
                    {stats.selectedReady > 0 && (
                      <button onClick={() => saveAll(true)} disabled={bulkSaving} className="pm-btn pm-btn-blue pm-btn-sm" style={{ flexShrink: 0 }}>
                        💾 Selected ({stats.selectedReady})
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ── PRODUCT CARDS ── */}
              {displayRows.length > 0 && displayRows.map((row, i) => {
                const { state } = row;
                const isUp     = state === "unpriced";
                const isMod    = state === "modified";
                const isSaved  = state === "saved";
                const isPriced = state === "priced";
                const isErr    = state === "error";
                const isSav    = state === "saving";

                const barColor = isErr ? "#dc2626"
                               : isSaved ? "#16a34a"
                               : isPriced ? "#0f3f2f"
                               : isMod ? "#2563eb"
                               : isUp ? "#d97706"
                               : "#e5e7eb";

                const cardBg = isErr ? "rgba(220,38,38,0.02)"
                             : isSaved ? "rgba(22,163,74,0.02)"
                             : isPriced ? "rgba(15,63,47,0.01)"
                             : (isUp && highlightUnpriced) ? "rgba(217,119,6,0.02)"
                             : "white";

                const mColor = marginColor(row.result);
                const mPct   = row.result ? marginPct(row.result) : 0;
                const isExpanded = expandedIds.has(row.product.id);
                const toggleExpand = () => setExpandedIds(prev => {
                  const s = new Set(prev);
                  s.has(row.product.id) ? s.delete(row.product.id) : s.add(row.product.id);
                  return s;
                });

                // Initials fallback
                const initials = ((row.product.brand || row.product.title || "?")
                  .trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase());
                const initialsColor = ["#0f3f2f","#2563eb","#7c3aed","#b45309","#0891b2","#be185d"][
                  Math.abs(row.product.title.charCodeAt(0) % 6)
                ];

                return (
                  <div key={row.product.id} className="pc" style={{ background: cardBg, animationDelay: `${Math.min(i, 15) * 25}ms` }}>
                    {/* State bar */}
                    <div className="pc-state-bar" style={{ background: barColor }} />

                    {/* Product header — always visible */}
                    <div className="pc-header" style={{ cursor: "pointer" }} onClick={toggleExpand}>
                      <input type="checkbox" checked={row.isSelected}
                        onClick={e => e.stopPropagation()}
                        onChange={() => toggleRow(row.product.id)}
                        className="pc-sel-check" />

                      <div className="pc-thumb">
                        {(row.product as any).main_image && !row.imgErr ? (
                          <img src={(row.product as any).main_image} alt={row.product.title}
                            loading="lazy" decoding="async"
                            onError={() => setImgErr(row.product.id)} />
                        ) : (
                          <div style={{
                            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                            background: `${initialsColor}18`, color: initialsColor,
                            fontWeight: 900, fontSize: 15, borderRadius: 8, userSelect: "none",
                          }}>
                            {initials}
                          </div>
                        )}
                      </div>

                      <div className="pc-info" style={{ minWidth: 0 }}>
                        <div className="pc-title-row">
                          <div className="pc-title">{row.product.title}</div>
                          <button
                            className={`pc-copy-btn${copiedId === row.product.id ? " pc-copy-btn-done" : ""}`}
                            onClick={e => { e.stopPropagation(); copyTitle(row.product.id, row.product.title); }}
                            title="Copy product name">
                            {copiedId === row.product.id ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            )}
                          </button>
                        </div>
                        <div className="pc-meta">
                          {[row.product.brand, row.product.category].filter(Boolean).join(" · ") || "No category"}
                          {row.product.sku && <span style={{ marginLeft: 4, fontFamily: "monospace", fontSize: 10, color: "#d1d5db" }}>· {row.product.sku}</span>}
                        </div>
                        <div className="pc-badge-row">
                          <PricingBadge state={state} />
                          {row.product.price && row.product.price > 0 && (
                            <span className="pc-dbprice">DB: M{fmt(row.product.price)}</span>
                          )}
                          {(isPriced || isSaved) && row.toolPrice && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#0f3f2f", background: "rgba(15,63,47,0.08)", padding: "2px 6px", borderRadius: 4 }}>✓ via tool</span>
                          )}
                        </div>
                      </div>

                      {/* Collapse chevron */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
                        style={{ flexShrink: 0, transition: "transform 0.2s", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>

                    {/* Collapsible body */}
                    {isExpanded && (
                      <>
                    {/* INR input */}
                    <div className="pc-input-section">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <div className="pc-input-label" style={{ marginBottom: 0 }}>Market Price (₹)</div>
                        {row.result && (
                          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>
                            Ctrl+S to save
                          </span>
                        )}
                      </div>
                      <div className="pc-inr-wrap">
                        <span className="pc-rupee">₹</span>
                        <input
                          ref={el => { if (el) inputRefs.current.set(row.product.id, el); else inputRefs.current.delete(row.product.id); }}
                          type="number"
                          value={row.marketInr}
                          onChange={e => updateRow(row.product.id, e.target.value)}
                          onKeyDown={e => handleKeyDown(e, row.product.id)}
                          onBlur={() => handleInputBlur(row.product.id)}
                          placeholder="e.g. 2499"
                          disabled={isSav}
                          className={`pc-inr ${row.marketInr !== "" ? "pc-inr-active" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Results */}
                    {row.result && (
                      <div className="pc-results">
                        <div className="pc-final-row">
                          <div>
                            <div className="pc-final-label">Final Price</div>
                            <div className="pc-final-price">M {fmt(row.result.final_price_lsl)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Compare</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#9ca3af", textDecoration: "line-through" }}>M {fmt(row.result.compare_price_lsl)}</div>
                          </div>
                        </div>
                        <div className="pc-stats-row">
                          <span className="pc-stat-chip" style={{ color: mColor, background: `${mColor}18` }}>
                            {mPct}% margin
                          </span>
                          <span className="pc-stat-chip" style={{ background: "#dcfce7", color: "#14532d" }}>
                            -{row.result.discount_pct}% discount
                          </span>
                          <span className="pc-stat-chip" style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 10 }}>
                            saves M{fmt(row.result.savings_lsl)}
                          </span>
                        </div>
                        {mPct < 8 && (
                          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", padding: "5px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5 }}>
                            ⚠ Margin too low — consider raising the price
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pc-actions">
                      {/* Saving spinner */}
                      {isSav && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "#f9fafb", borderRadius: 8, color: "#6b7280", fontWeight: 700, fontSize: 13 }}>
                          <span className="pm-spin" style={{ width: 16, height: 16, border: "2.5px solid #e5e7eb", borderTopColor: "#0f3f2f", borderRadius: "50%" }} />
                          Saving…
                        </div>
                      )}

                      {/* Error retry */}
                      {isErr && (
                        <button onClick={() => saveRow(row.product.id)} className="pc-save-btn pc-save-error" style={{ flex: 1 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>
                          {row.errorMsg ? `Retry (${row.errorMsg.substring(0, 20)}…)` : "Retry"}
                        </button>
                      )}

                      {/* Saved state */}
                      {isSaved && !isSav && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "#dcfce7", borderRadius: 8, color: "#14532d", fontWeight: 800, fontSize: 14 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                          Price Saved
                        </div>
                      )}

                      {/* Save button */}
                      {!isSav && !isErr && !isSaved && (
                        <button
                          onClick={() => saveRow(row.product.id)}
                          disabled={!row.result}
                          className={`pc-save-btn ${row.result ? "pc-save-active" : "pc-save-disabled"}`}
                          style={{ flex: 1 }}>
                          {row.result ? (
                            <>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                              Save Price
                            </>
                          ) : "Enter ₹ Price Above"}
                        </button>
                      )}

                      {/* Mark as priced */}
                      {(isUp || isMod) && !isSav && (
                        <button onClick={() => markAsPriced(row.product.id)} className="pc-mark-btn pc-mark-priced">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                          Mark Priced
                        </button>
                      )}

                      {/* Reset to unpriced */}
                      {(isPriced || isSaved) && !isSav && (
                        <button onClick={() => markAsUnpriced(row.product.id)} className="pc-mark-btn pc-mark-reset">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>
                          Reset
                        </button>
                      )}
                    </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Footer */}
              {displayRows.length > 0 && (
                <div style={{ padding: "8px 4px", fontSize: 11, color: "#9ca3af", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>📦 {rows.length} loaded (all products)</span>
                  {totalCount > rows.length && <span>· {totalCount} in DB</span>}
                  <span>✏️ {stats.withResult} calculated</span>
                  <span style={{ color: "#d97706", fontWeight: 700 }}>⚠ {stats.unpriced} unpriced</span>
                  <span style={{ color: "#0f3f2f", fontWeight: 700 }}>✓ {stats.priced} priced</span>
                  {stats.errors > 0 && <span style={{ color: "#dc2626", fontWeight: 700 }}>✗ {stats.errors} errors</span>}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── STICKY SAVE BAR ─── */}
        {stats.readyToSave > 0 && (
          <div className="pm-save-bar">
            <div className="pm-save-pulse" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>
                {stats.readyToSave} price{stats.readyToSave !== 1 ? "s" : ""} ready
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                Won't appear in store until saved
              </div>
            </div>
            {stats.selectedReady > 0 && (
              <button onClick={() => saveAll(true)} disabled={bulkSaving} className="pm-btn pm-btn-blue pm-btn-sm">
                Selected ({stats.selectedReady})
              </button>
            )}
            <button
              onClick={() => saveAll(false)}
              disabled={bulkSaving}
              className="pm-btn pm-btn-primary"
              style={{ minWidth: 120 }}>
              {bulkSaving
                ? <><span className="pm-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", marginRight: 6 }} />Saving…</>
                : `💾 Save All (${stats.readyToSave})`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}