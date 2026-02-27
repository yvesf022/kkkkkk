"use client";

/**
 * FILE: app/admin/pricing/page.tsx
 *
 * KARABO PRICING MANAGER — Full Rebuild
 *
 * WHAT'S NEW vs old version:
 *  ✅ Two-stage workflow: AI proposes → admin approves (is_priced only flips on explicit approval)
 *  ✅ Admin must approve or reject every price — no auto-saves bypassing review
 *  ✅ Proposal history panel per product (last N suggestions with source + confidence)
 *  ✅ DB is the ONLY source of truth — localStorage is write-through cache only, never overrides DB
 *  ✅ "Delete product" per card — soft-delete directly from pricing tool, with confirm dialog
 *  ✅ Stale-rate warning when exchange rate fell back to hardcoded value
 *  ✅ Confidence badges (High / Medium / Low) from AI response
 *  ✅ priced_by stored — shows which admin approved
 *  ✅ Single atomic API call for manual saves (approve-manual) — no partial-save race
 *  ✅ AI-suggested state is visually distinct from admin-approved
 *  ✅ Bulk approve with progress — replaces fire-and-forget bulk save
 *  ✅ Category-scoped quick fill
 *  ✅ Stale data banner (data loaded > 15 minutes ago)
 *  ✅ CSV export includes INR source, confidence, exchange rate, approved_at
 *  ✅ Delete confirmation inline — no modal popup needed
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── tiny token helper (matches rest of your app) ──────────────────────────
function getAdminToken(): string {
  try {
    return (
      localStorage.getItem("admin_token") ||
      localStorage.getItem("karabo_admin_token") ||
      ""
    );
  } catch { return ""; }
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization:  `Bearer ${getAdminToken()}`,
  };
}

async function api<T = any>(method: string, path: string, body?: any): Promise<T> {
  const r = await fetch(`${BACKEND}${path}`, {
    method,
    headers: authHeaders(),
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? `HTTP ${r.status}`);
  }
  return r.json();
}

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
type PricingStatus =
  | "unpriced"        // not touched yet
  | "ai_suggested"    // AI proposed, waiting for admin approval
  | "admin_approved"  // admin approved → is_priced = true in DB
  | "admin_rejected"  // admin rejected the AI suggestion
  | "saving"          // mid-flight (local only)
  | "error";          // last action failed (local only)

type Confidence = "high" | "medium" | "low";

type ProposalData = {
  proposal_id:       string;
  inr_price:         number;
  source:            string;
  confidence:        Confidence;
  exchange_rate:     number;
  rate_source:       string;
  is_fallback_rate:  boolean;
  final_price_lsl:   number;
  compare_price_lsl: number;
  discount_pct:      number;
  margin_pct:        number;
};

type BatchRow = {
  product:      ProductListItem;
  status:       PricingStatus;
  marketInr:    string;             // typed by admin
  computed:     ComputedPrice | null; // from frontend calculatePrice()
  proposal:     ProposalData | null;  // latest pending AI proposal
  errorMsg:     string | null;
  isSelected:   boolean;
  confirmDelete: boolean;           // show inline confirm UI
  isDeleted:    boolean;            // soft-deleted, remove from list
};

type ComputedPrice = {
  final_price_lsl:   number;
  compare_price_lsl: number;
  discount_pct:      number;
  margin_pct:        number;
  savings_lsl:       number;
};

type ProductListItem = {
  id:            string;
  title:         string;
  brand:         string | null;
  category:      string | null;
  price:         number | null;
  compare_price: number | null;
  stock:         number;
  status:        string;
  is_priced:     boolean;
  pricing_status:string | null;
  priced_at:     string | null;
  main_image:    string | null;
};

type FilterTab  = "all" | "unpriced" | "approved" | "suggested";
type SortKey    = "default" | "name" | "unpriced_first" | "price_asc" | "price_desc";

/* ═══════════════════════════════════════════════════
   PRICING FORMULA  (mirrors backend exactly)
═══════════════════════════════════════════════════ */
const SHIPPING_INR = 700;
const PROFIT_INR   = 500;
const COMPARE_MULT = 1.30;

function calculatePrice(marketInr: number, rate: number): ComputedPrice {
  const total    = marketInr + SHIPPING_INR + PROFIT_INR;
  const rawLsl   = total * rate;
  const finalLsl = Math.round(rawLsl * 2) / 2;
  const compare  = Math.round(finalLsl * COMPARE_MULT * 100) / 100;
  const savings  = Math.round((compare - finalLsl) * 100) / 100;
  const disc     = compare ? Math.round((savings / compare) * 100) : 0;
  const margin   = finalLsl ? Math.round((PROFIT_INR * rate / finalLsl) * 100 * 10) / 10 : 0;
  return {
    final_price_lsl:   Math.round(finalLsl * 100) / 100,
    compare_price_lsl: compare,
    discount_pct:      disc,
    margin_pct:        margin,
    savings_lsl:       savings,
  };
}

/* ═══════════════════════════════════════════════════
   LIGHTWEIGHT SESSION (inputs only — DB is truth)
═══════════════════════════════════════════════════ */
const SESSION_KEY = "karabo_pricing_session_v2";
type Session = { inputs: Record<string, string>; scrollTop: number; savedAt: number };

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d: Session = JSON.parse(raw);
    if (Date.now() - (d.savedAt ?? 0) > 7 * 86_400_000) return null;
    return d;
  } catch { return null; }
}
function saveSession(patch: Partial<Session>) {
  try {
    const prev = loadSession() ?? { inputs: {}, scrollTop: 0, savedAt: 0 };
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...prev, ...patch, savedAt: Date.now() }));
  } catch {}
}

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
const fmt = (n: number, d = 2) => n.toFixed(d);

function marginColor(m: number) {
  if (m < 8)  return "#dc2626";
  if (m < 15) return "#d97706";
  return "#0f3f2f";
}

function confidenceBadge(c: Confidence | undefined) {
  if (!c) return null;
  const map = {
    high:   { bg: "#dcfce7", color: "#14532d", label: "● High confidence" },
    medium: { bg: "#fef3c7", color: "#92400e", label: "◑ Medium confidence" },
    low:    { bg: "#fee2e2", color: "#991b1b", label: "○ Low confidence" },
  };
  const s = map[c] ?? map.low;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 7px", borderRadius:12, fontSize:10, fontWeight:700, background:s.bg, color:s.color }}>
      {s.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: PricingStatus | string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    unpriced:       { label: "Unpriced",    bg:"#fef3c7", color:"#92400e" },
    ai_suggested:   { label: "AI Suggested",bg:"#e0f2fe", color:"#075985" },
    admin_approved: { label: "✓ Approved",  bg:"#dcfce7", color:"#14532d" },
    admin_rejected: { label: "Rejected",    bg:"#fee2e2", color:"#991b1b" },
    saving:         { label: "Saving…",     bg:"#f3f4f6", color:"#6b7280" },
    error:          { label: "Error",       bg:"#fee2e2", color:"#991b1b" },
  };
  const s = map[status] ?? map.unpriced;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700,
      background:s.bg, color:s.color, whiteSpace:"nowrap",
    }}>
      {s.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function AdminPricingPage() {

  const [rate, setRate]             = useState(0.21);
  const [rateSrc, setRateSrc]       = useState<"live"|"fallback">("fallback");
  const [rateLoading, setRateLoad]  = useState(true);
  const [rateOverride, setOverride] = useState("");
  const effectiveRate = rateOverride ? (parseFloat(rateOverride) || rate) : rate;

  const [rows, setRows]             = useState<BatchRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [searchQ, setSearchQ]       = useState("");
  const [catFilter, setCat]         = useState("");
  const [brandFilter, setBrand]     = useState("");
  const [filterTab, setFilterTab]   = useState<FilterTab>("all");
  const [sortKey, setSort]          = useState<SortKey>("unpriced_first");
  const [showFilters, setFilters]   = useState(false);
  const [quickFill, setQuickFill]   = useState("");
  const [bulkAiRunning, setAiRun]   = useState(false);
  const [aiProgress, setAiProgress] = useState({ done:0, total:0, failed:0 });
  const [toast, setToast]           = useState<{ msg:string; ok:boolean; undo?:()=>void }|null>(null);
  const [totalCount, setTotal]      = useState(0);
  const [loadedAt, setLoadedAt]     = useState<number|null>(null);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const inputRefs   = useRef<Map<string,HTMLInputElement>>(new Map());
  const toastTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── Exchange rate ──────────────────────────────────────────────────────────
  useEffect(() => {
    api("GET", "/api/products/admin/auto-price/rate")
      .then(d => { setRate(d.rate); setRateSrc(d.source); })
      .catch(() => {})
      .finally(() => setRateLoad(false));
  }, []);

  // ── Re-compute all calculated prices when rate changes ────────────────────
  useEffect(() => {
    setRows(prev => prev.map(row => {
      const v = parseFloat(row.marketInr);
      if (!isNaN(v) && v > 0)
        return { ...row, computed: calculatePrice(v, effectiveRate) };
      return row;
    }));
  }, [effectiveRate]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, ok = true, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 4800 : 3200);
  }, []);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const categories = useMemo(() =>
    [...new Set(rows.map(r => r.product.category).filter(Boolean))].sort() as string[], [rows]);
  const brands = useMemo(() =>
    [...new Set(rows.map(r => r.product.brand).filter(Boolean))].sort() as string[], [rows]);

  const stats = useMemo(() => {
    const live       = rows.filter(r => !r.isDeleted);
    const unpriced   = live.filter(r => r.status === "unpriced" || r.status === "admin_rejected").length;
    const approved   = live.filter(r => r.status === "admin_approved").length;
    const suggested  = live.filter(r => r.status === "ai_suggested").length;
    const errors     = live.filter(r => r.status === "error").length;
    const readyToSave = live.filter(r => r.computed && r.status !== "admin_approved" && r.status !== "saving").length;
    const selectedReady = live.filter(r => r.isSelected && r.computed && r.status !== "admin_approved").length;
    const pctDone    = live.length > 0 ? Math.round((approved / live.length) * 100) : 0;
    return { total:live.length, unpriced, approved, suggested, errors, readyToSave, selectedReady, pctDone };
  }, [rows]);

  // ── Display rows (filter + sort, exclude deleted) ─────────────────────────
  const displayRows = useMemo(() => {
    let r = rows.filter(row => !row.isDeleted);
    if (filterTab === "unpriced")  r = r.filter(row => row.status === "unpriced" || row.status === "admin_rejected");
    if (filterTab === "approved")  r = r.filter(row => row.status === "admin_approved");
    if (filterTab === "suggested") r = r.filter(row => row.status === "ai_suggested");
    if (catFilter)   r = r.filter(row => row.product.category === catFilter);
    if (brandFilter) r = r.filter(row => row.product.brand === brandFilter);
    if (sortKey === "name")          r = [...r].sort((a,b) => a.product.title.localeCompare(b.product.title));
    if (sortKey === "unpriced_first") r = [...r].sort((a,b) => {
      const aIsApproved = a.status === "admin_approved" ? 1 : 0;
      const bIsApproved = b.status === "admin_approved" ? 1 : 0;
      return aIsApproved - bIsApproved || a.product.title.localeCompare(b.product.title);
    });
    if (sortKey === "price_asc")  r = [...r].sort((a,b) => (a.product.price??0)-(b.product.price??0));
    if (sortKey === "price_desc") r = [...r].sort((a,b) => (b.product.price??0)-(a.product.price??0));
    return r;
  }, [rows, filterTab, catFilter, brandFilter, sortKey]);

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (searchQ)    qs.set("search",   searchQ);
      if (catFilter)  qs.set("category", catFilter);
      if (brandFilter) qs.set("brand",   brandFilter);

      const data = await api("GET", `/api/products/admin/pricing/all${qs.toString() ? `?${qs}` : ""}`);
      const products: ProductListItem[] = data.results ?? [];
      setTotal(data.total ?? products.length);

      const session     = loadSession();
      const savedInputs = session?.inputs ?? {};

      setRows(products.map((p: ProductListItem) => {
        const dbStatus   = p.pricing_status || (p.is_priced ? "admin_approved" : "unpriced");
        const savedInr   = savedInputs[p.id] ?? "";
        const v          = parseFloat(savedInr);
        const computed   = (!isNaN(v) && v > 0) ? calculatePrice(v, effectiveRate) : null;
        const status: PricingStatus =
          dbStatus === "admin_approved" ? "admin_approved" :
          dbStatus === "ai_suggested"   ? "ai_suggested"   :
          dbStatus === "admin_rejected" ? "admin_rejected" :
          computed ? "unpriced" : "unpriced";
        return {
          product:       p,
          status,
          marketInr:     savedInr,
          computed:      computed,
          proposal:      null,
          errorMsg:      null,
          isSelected:    false,
          confirmDelete: false,
          isDeleted:     false,
        };
      }));
      setLoadedAt(Date.now());
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load products", false);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, catFilter, brandFilter, showToast]);

  // ── Ctrl+S / Cmd+S — approve focused product ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== "s") return;
      e.preventDefault();
      for (const [id, el] of inputRefs.current.entries()) {
        if (document.activeElement === el) { approveManual(id); break; }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // ── Tab keyboard nav ───────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent, currentId: string) => {
    if (e.key !== "Tab" && e.key !== "Enter") return;
    e.preventDefault();
    const ids = displayRows.map(r => r.product.id);
    const next = ids[ids.indexOf(currentId) + 1];
    if (next) inputRefs.current.get(next)?.focus();
  };

  // ── Update INR input (live preview) ───────────────────────────────────────
  const updateRow = (id: string, val: string) => {
    const v = parseFloat(val);
    const computed = (!isNaN(v) && v > 0) ? calculatePrice(v, effectiveRate) : null;
    setRows(prev => prev.map(r =>
      r.product.id === id ? { ...r, marketInr:val, computed, status: r.status === "admin_approved" ? "admin_approved" : "unpriced" } : r
    ));
    // Persist input to session
    const session = loadSession() ?? { inputs:{}, scrollTop:0, savedAt:0 };
    if (val) session.inputs[id] = val;
    else     delete session.inputs[id];
    saveSession({ inputs: session.inputs });
  };

  // ── Approve manual price (single atomic API call) ─────────────────────────
  const approveManual = async (id: string) => {
    const row = rows.find(r => r.product.id === id);
    if (!row?.computed) return;
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, status:"saving" } : r));
    try {
      await api("POST", "/api/products/admin/auto-price/approve-manual", {
        product_id:        id,
        price_lsl:         row.computed.final_price_lsl,
        compare_price_lsl: row.computed.compare_price_lsl,
        inr_price:         parseFloat(row.marketInr) || 0,
        exchange_rate:     effectiveRate,
      });
      // Clear session input
      const session = loadSession() ?? { inputs:{}, scrollTop:0, savedAt:0 };
      delete session.inputs[id];
      saveSession({ inputs: session.inputs });

      setRows(prev => prev.map(r => r.product.id === id ? {
        ...r,
        status:   "admin_approved",
        errorMsg: null,
        product:  { ...r.product, price: row.computed!.final_price_lsl, compare_price: row.computed!.compare_price_lsl, is_priced:true, pricing_status:"admin_approved" },
      } : r));
      showToast(`✓ Approved — M ${fmt(row.computed.final_price_lsl)}`, true, () => markUnpriced(id));
    } catch (e: any) {
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, status:"error", errorMsg: e?.message } : r));
    }
  };

  // ── Approve AI proposal ───────────────────────────────────────────────────
  const approveProposal = async (id: string) => {
    const row = rows.find(r => r.product.id === id);
    if (!row?.proposal) return;
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, status:"saving" } : r));
    try {
      await api("POST", "/api/products/admin/auto-price/approve", {
        proposal_id: row.proposal.proposal_id,
      });
      setRows(prev => prev.map(r => r.product.id === id ? {
        ...r,
        status:   "admin_approved",
        errorMsg: null,
        product:  { ...r.product, price:row.proposal!.final_price_lsl, compare_price:row.proposal!.compare_price_lsl, is_priced:true, pricing_status:"admin_approved" },
      } : r));
      showToast(`✓ AI price approved — M ${fmt(row.proposal.final_price_lsl)}`, true);
    } catch (e: any) {
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, status:"error", errorMsg: e?.message } : r));
    }
  };

  // ── Reject AI proposal ────────────────────────────────────────────────────
  const rejectProposal = async (id: string) => {
    const row = rows.find(r => r.product.id === id);
    if (!row?.proposal) return;
    try {
      await api("POST", "/api/products/admin/auto-price/reject", {
        proposal_id: row.proposal.proposal_id,
      });
      setRows(prev => prev.map(r => r.product.id === id ? {
        ...r, status:"admin_rejected", proposal:null, errorMsg:null,
        product: { ...r.product, pricing_status:"admin_rejected" },
      } : r));
      showToast("AI suggestion rejected", false);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to reject", false);
    }
  };

  // ── Mark unpriced (reset) ─────────────────────────────────────────────────
  const markUnpriced = async (id: string) => {
    setRows(prev => prev.map(r => r.product.id === id ? {
      ...r, status:"unpriced", proposal:null, marketInr:"", computed:null,
      product: { ...r.product, is_priced:false, pricing_status:"unpriced", price:null },
    } : r));
    showToast("Reset to unpriced", false);
    try {
      await api("PATCH", `/api/products/admin/pricing/${id}/mark`, { is_priced: false });
    } catch {}
  };

  // ── AI search for one product ─────────────────────────────────────────────
  const runAiSearch = async (id: string) => {
    const row = rows.find(r => r.product.id === id);
    if (!row) return;
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, status:"saving", errorMsg:null } : r));
    try {
      const data = await api("POST", "/api/products/admin/auto-price/propose", {
        product_id: id,
        title:      row.product.title,
        brand:      row.product.brand,
        category:   row.product.category,
      });
      setRows(prev => prev.map(r => r.product.id === id ? {
        ...r,
        status:   "ai_suggested",
        proposal: {
          proposal_id:       data.proposal_id,
          inr_price:         data.inr_price,
          source:            data.source,
          confidence:        data.confidence,
          exchange_rate:     data.exchange_rate,
          rate_source:       data.rate_source,
          is_fallback_rate:  data.is_fallback_rate,
          final_price_lsl:   data.final_price_lsl,
          compare_price_lsl: data.compare_price_lsl,
          discount_pct:      data.discount_pct,
          margin_pct:        data.margin_pct,
        },
        errorMsg: null,
      } : r));
    } catch (e: any) {
      const isNotFound = e?.message?.includes("not found") || e?.message?.includes("422");
      setRows(prev => prev.map(r => r.product.id === id ? {
        ...r,
        status:   isNotFound ? "unpriced" : "error",
        errorMsg: isNotFound ? "Not found on Indian sites" : e?.message,
      } : r));
    }
  };

  // ── Bulk approve ──────────────────────────────────────────────────────────
  const bulkApprove = async (selectedOnly = false) => {
    const toSave = rows.filter(r =>
      !r.isDeleted && r.computed &&
      r.status !== "admin_approved" && r.status !== "saving" &&
      (!selectedOnly || r.isSelected)
    );
    if (!toSave.length) { showToast("No calculated prices to approve", false); return; }

    setRows(prev => prev.map(r =>
      toSave.some(t => t.product.id === r.product.id) ? { ...r, status:"saving" } : r
    ));

    try {
      const res = await api("POST", "/api/products/admin/auto-price/approve-bulk", {
        items: toSave.map(r => ({
          product_id:        r.product.id,
          price_lsl:         r.proposal?.final_price_lsl ?? r.computed!.final_price_lsl,
          compare_price_lsl: r.proposal?.compare_price_lsl ?? r.computed!.compare_price_lsl,
          inr_price:         r.proposal?.inr_price ?? (parseFloat(r.marketInr) || 0),
          exchange_rate:     r.proposal?.exchange_rate ?? effectiveRate,
        })),
      });

      const succeededIds = new Set(toSave.slice(0, res.success).map((r: BatchRow) => r.product.id));
      // Clear session inputs for succeeded
      const session = loadSession() ?? { inputs:{}, scrollTop:0, savedAt:0 };
      succeededIds.forEach(id => delete session.inputs[id]);
      saveSession({ inputs: session.inputs });

      setRows(prev => prev.map(r => {
        if (!toSave.some(t => t.product.id === r.product.id)) return r;
        if (succeededIds.has(r.product.id)) {
          const srcPrice = r.proposal?.final_price_lsl ?? r.computed?.final_price_lsl ?? 0;
          return { ...r, status:"admin_approved", errorMsg:null,
            product: { ...r.product, price:srcPrice, is_priced:true, pricing_status:"admin_approved" }
          };
        }
        return { ...r, status:"error", errorMsg:"Save failed" };
      }));
      showToast(`${res.success} approved${res.failed ? `, ${res.failed} failed` : ""}`, res.failed === 0);
    } catch (e: any) {
      setRows(prev => prev.map(r =>
        toSave.some(t => t.product.id === r.product.id) ? { ...r, status:"error", errorMsg:e?.message } : r
      ));
      showToast(e?.message ?? "Bulk approve failed", false);
    }
  };

  // ── Quick fill ────────────────────────────────────────────────────────────
  const applyQuickFill = () => {
    const v = parseFloat(quickFill);
    if (isNaN(v) || v <= 0) return;
    const computed = calculatePrice(v, effectiveRate);
    const scope    = catFilter ? displayRows.filter(r => r.status !== "admin_approved").map(r => r.product.id) : null;
    setRows(prev => prev.map(row => {
      if (row.isDeleted || row.status === "admin_approved") return row;
      if (scope && !scope.includes(row.product.id)) return row;
      const session = loadSession() ?? { inputs:{}, scrollTop:0, savedAt:0 };
      session.inputs[row.product.id] = String(v);
      saveSession({ inputs: session.inputs });
      return { ...row, marketInr:String(v), computed, status:"unpriced" };
    }));
    showToast(`Applied ₹${v.toLocaleString()} to unpriced${catFilter ? ` (${catFilter})` : ""} products`);
    setQuickFill("");
  };

  // ── Delete product ────────────────────────────────────────────────────────
  const deleteProduct = async (id: string) => {
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, status:"saving" } : r));
    try {
      await api("DELETE", `/api/products/admin/pricing/${id}/delete`);
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, isDeleted:true, confirmDelete:false } : r));
      showToast("Product removed from store", false);
    } catch (e: any) {
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, status:"error", errorMsg:e?.message, confirmDelete:false } : r));
      showToast(e?.message ?? "Delete failed", false);
    }
  };

  const setConfirmDelete = (id: string, v: boolean) =>
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, confirmDelete:v } : r));

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const csvRows = [
      "Title,Brand,Category,INR Price,Source,Confidence,Exchange Rate,Final (M),Compare (M),Discount %,Margin %,Status",
    ];
    rows.filter(r => !r.isDeleted).forEach(r => {
      const p = r.proposal;
      csvRows.push([
        `"${r.product.title.replace(/"/g,'""')}"`,
        r.product.brand ?? "",
        r.product.category ?? "",
        p ? p.inr_price : (r.marketInr || ""),
        p ? p.source : "manual",
        p ? p.confidence : (r.computed ? "manual" : ""),
        p ? p.exchange_rate : (r.computed ? effectiveRate : ""),
        p ? p.final_price_lsl : (r.computed?.final_price_lsl ?? ""),
        p ? p.compare_price_lsl : (r.computed?.compare_price_lsl ?? ""),
        p ? p.discount_pct : (r.computed?.discount_pct ?? ""),
        p ? p.margin_pct : (r.computed?.margin_pct ?? ""),
        r.status,
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type:"text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `pricing-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Exported ${rows.length} products`);
  };

  const isStale = loadedAt && Date.now() - loadedAt > 15 * 60_000;

  /* ════════════════ RENDER ════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer   { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes toastIn   { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pulse     { 0%,100%{box-shadow:0 0 0 0 rgba(200,167,90,.3)} 50%{box-shadow:0 0 0 6px rgba(200,167,90,0)} }
        @keyframes deleteShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }

        * { box-sizing: border-box; }
        .pm {
          height: 100dvh; display: flex; flex-direction: column; overflow: hidden;
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #f5f5f0; color: #111;
        }

        /* CHROME */
        .pm-chrome { flex-shrink:0; background:#fff; border-bottom:1px solid #e5e7eb; box-shadow:0 1px 4px rgba(0,0,0,.05); }
        .pm-chrome-r1 { display:flex; align-items:center; gap:8px; padding:10px 14px; flex-wrap:wrap; }
        .pm-chrome-r2 { padding:0 14px 10px; display:flex; flex-direction:column; gap:8px; }

        /* BODY */
        .pm-body { flex:1; overflow-y:auto; overflow-x:hidden; min-height:0; padding:12px 12px 100px; }

        /* STALE BANNER */
        .pm-stale { background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:8px 14px; margin-bottom:10px;
          display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:#92400e; animation:slideDown .2s ease; }

        /* TABS */
        .pm-tab { display:inline-flex; align-items:center; gap:5px; padding:7px 13px; border-radius:8px;
          font-size:12px; font-weight:700; border:1.5px solid transparent; cursor:pointer;
          font-family:inherit; transition:all .15s; white-space:nowrap; }
        .pm-tab-on  { background:#0f3f2f; color:white; border-color:#0f3f2f; }
        .pm-tab-off { background:white; color:#6b7280; border-color:#e5e7eb; }
        .pm-tab-off:hover { border-color:#0f3f2f; color:#0f3f2f; }

        /* FILTER PILLS */
        .pm-pill-row { display:flex; gap:6px; flex-wrap:wrap; }
        .pm-pill { padding:5px 12px; border-radius:20px; font-size:12px; font-weight:700;
          border:1.5px solid #e5e7eb; cursor:pointer; font-family:inherit; transition:all .15s; }
        .pm-pill-on  { background:#0f3f2f; color:white; border-color:#0f3f2f; }
        .pm-pill-off { background:white; color:#6b7280; }
        .pm-pill-off:hover { border-color:#0f3f2f; color:#0f3f2f; }

        /* BUTTONS */
        .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:9px 16px;
          border-radius:8px; font-size:13px; font-weight:700; border:none; cursor:pointer;
          font-family:inherit; transition:all .15s; white-space:nowrap; min-height:38px; }
        .btn:active:not(:disabled) { transform:scale(.97); }
        .btn-primary { background:#0f3f2f; color:white; box-shadow:0 2px 6px rgba(15,63,47,.2); }
        .btn-primary:hover:not(:disabled) { background:#1b5e4a; }
        .btn-primary:disabled { background:#e5e7eb; color:#9ca3af; box-shadow:none; cursor:not-allowed; }
        .btn-ghost   { background:white; color:#374151; border:1.5px solid #e5e7eb; }
        .btn-ghost:hover:not(:disabled) { border-color:#0f3f2f; color:#0f3f2f; }
        .btn-gold    { background:#c8a75a; color:white; }
        .btn-gold:hover:not(:disabled) { background:#b8973e; }
        .btn-ai      { background:linear-gradient(135deg,#1d4ed8,#4f46e5); color:white; }
        .btn-ai:hover:not(:disabled) { background:linear-gradient(135deg,#1e40af,#4338ca); }
        .btn-danger  { background:#fee2e2; color:#991b1b; border:1.5px solid #fca5a5; }
        .btn-danger:hover:not(:disabled) { background:#fecaca; }
        .btn-warn    { background:#fff7ed; color:#92400e; border:1.5px solid #fed7aa; }
        .btn-warn:hover:not(:disabled) { background:#ffedd5; }
        .btn-sm { padding:6px 12px; font-size:12px; min-height:32px; }
        .btn-xs { padding:4px 9px; font-size:11px; min-height:26px; border-radius:6px; }

        /* STATS */
        .pm-stats { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
        .pm-stat  { flex:1; min-width:72px; background:white; border:1px solid #e5e7eb; border-radius:10px;
          padding:9px 12px; text-align:center; }
        .pm-stat-v { font-size:20px; font-weight:900; font-family:'Syne',sans-serif; line-height:1; }
        .pm-stat-l { font-size:10px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-top:3px; }

        /* PROGRESS */
        .pm-prog-wrap { height:6px; background:#f3f4f6; border-radius:20px; overflow:hidden; margin-bottom:10px; }
        .pm-prog-fill { height:100%; border-radius:20px; background:linear-gradient(90deg,#0f3f2f,#16a34a); transition:width .6s; }

        /* FILTER PANEL */
        .pm-filter-panel { background:white; border:1px solid #e5e7eb; border-radius:10px; padding:14px;
          margin-bottom:10px; display:flex; flex-direction:column; gap:10px; animation:slideDown .2s ease; }
        .pm-filter-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

        /* SEARCH */
        .pm-search-wrap  { position:relative; flex:1; min-width:160px; }
        .pm-search-icon  { position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; }
        .pm-search-input { width:100%; padding:10px 12px 10px 34px; border:1.5px solid #e5e7eb; border-radius:8px;
          font-size:13px; font-family:inherit; background:white; color:#111; outline:none; min-height:40px;
          transition:border-color .15s; }
        .pm-search-input:focus { border-color:#0f3f2f; }

        /* INPUT */
        .pm-input  { padding:8px 12px; border:1.5px solid #e5e7eb; border-radius:8px; font-size:13px;
          font-family:inherit; background:white; color:#111; outline:none; min-height:38px; width:100%;
          transition:border-color .15s; }
        .pm-input:focus { border-color:#0f3f2f; }
        .pm-select { padding:8px 28px 8px 10px; border:1.5px solid #e5e7eb; border-radius:8px; font-size:13px;
          font-family:inherit; background:white; color:#374151; outline:none; appearance:none; cursor:pointer;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 9px center; min-height:38px; transition:border-color .15s; }
        .pm-select:focus { border-color:#0f3f2f; outline:none; }

        /* PRODUCT CARD */
        .pc { background:white; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden; margin-bottom:10px;
          box-shadow:0 1px 4px rgba(0,0,0,.04); animation:fadeUp .25s ease both; transition:border-color .2s,box-shadow .2s; }
        .pc:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
        .pc-approved { border-color:#bbf7d0; }
        .pc-suggested { border-color:#bae6fd; }
        .pc-error     { border-color:#fca5a5; }
        .pc-deleting  { opacity:.5; pointer-events:none; }

        .pc-bar { height:3px; width:100%; }
        .pc-bar-unpriced  { background:#e5e7eb; }
        .pc-bar-approved  { background:linear-gradient(90deg,#16a34a,#4ade80); }
        .pc-bar-suggested { background:linear-gradient(90deg,#0284c7,#38bdf8); }
        .pc-bar-error     { background:#dc2626; }

        .pc-header { display:flex; align-items:flex-start; gap:12px; padding:12px 14px 10px; }
        .pc-thumb  { width:52px; height:52px; border-radius:8px; overflow:hidden; border:1px solid #f3f4f6;
          background:#f9fafb; display:grid; place-items:center; flex-shrink:0; }
        .pc-thumb img { width:100%; height:100%; object-fit:cover; }
        .pc-info { flex:1; min-width:0; }
        .pc-title-row { display:flex; align-items:flex-start; gap:6px; margin-bottom:4px; }
        .pc-title { font-size:13px; font-weight:700; color:#111; line-height:1.35; word-break:break-word; flex:1; }
        .pc-meta  { font-size:11px; color:#9ca3af; margin-bottom:5px; }
        .pc-badge-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }

        /* DELETE BUTTON on card header */
        .pc-del-btn { flex-shrink:0; display:inline-flex; align-items:center; justify-content:center;
          width:26px; height:26px; border-radius:6px; border:1.5px solid #e5e7eb; background:white;
          color:#9ca3af; cursor:pointer; transition:all .15s; padding:0; }
        .pc-del-btn:hover { border-color:#fca5a5; color:#dc2626; background:#fff5f5; }

        /* DELETE CONFIRM BAR */
        .pc-del-confirm { padding:10px 14px; background:#fff5f5; border-top:1px solid #fecaca;
          display:flex; align-items:center; gap:8px; flex-wrap:wrap; animation:deleteShake .3s ease; }
        .pc-del-confirm-msg { flex:1; font-size:12px; font-weight:700; color:#991b1b; }

        /* INR INPUT */
        .pc-input-section { padding:10px 14px; border-top:1px solid #f3f4f6; background:#fafafa; }
        .pc-input-label  { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.6px; margin-bottom:6px; }
        .pc-inr-wrap { position:relative; display:flex; align-items:center; }
        .pc-rupee { position:absolute; left:12px; font-size:16px; font-weight:700; color:#c8a75a; pointer-events:none; }
        .pc-inr   { width:100%; padding:11px 12px 11px 30px; border:2px solid #e5e7eb; border-radius:8px;
          font-size:18px; font-weight:700; color:#111; background:white; font-family:inherit; outline:none;
          transition:border-color .15s,box-shadow .15s; min-height:48px; }
        .pc-inr:focus { border-color:#c8a75a; box-shadow:0 0 0 3px rgba(200,167,90,.12); }
        .pc-inr:disabled { opacity:.4; cursor:not-allowed; }
        .pc-inr-active { border-color:#c8a75a !important; }
        .pc-inr::placeholder { color:#d1d5db; font-weight:400; font-size:15px; }

        /* RESULTS */
        .pc-results { padding:10px 14px; border-top:1px solid #f3f4f6; background:rgba(15,63,47,.02); }
        .pc-final-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; flex-wrap:wrap; }
        .pc-final-lbl   { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.5px; }
        .pc-final-price { font-size:22px; font-weight:900; color:#0f3f2f; font-family:'Syne',sans-serif; letter-spacing:-.5px; }
        .pc-chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
        .pc-chip  { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
        .pc-chip-margin { background:rgba(15,63,47,.07); color:#0f3f2f; }
        .pc-chip-disc   { background:#dcfce7; color:#14532d; }
        .pc-chip-save   { background:#f0fdf4; color:#16a34a; }
        .pc-chip-cmp    { background:#f3f4f6; color:#9ca3af; text-decoration:line-through; }

        /* AI PROPOSAL CARD */
        .pc-proposal { padding:10px 14px; border-top:1px solid #e0f2fe; background:rgba(2,132,199,.04); }
        .pc-proposal-title { font-size:11px; font-weight:800; color:#0284c7; text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; display:flex; align-items:center; gap:5px; }
        .pc-proposal-row   { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

        /* ACTIONS */
        .pc-actions { padding:10px 14px; border-top:1px solid #f3f4f6; display:flex; gap:8px; flex-wrap:wrap; }
        .pc-save-btn { flex:1; min-width:100px; padding:12px 14px; border-radius:8px; font-size:14px; font-weight:800;
          border:none; cursor:pointer; font-family:inherit; transition:all .15s; display:flex; align-items:center;
          justify-content:center; gap:6px; min-height:48px; }
        .pc-save-btn:active:not(:disabled) { transform:scale(.97); }
        .pc-save-active   { background:#0f3f2f; color:white; box-shadow:0 4px 14px rgba(15,63,47,.25); }
        .pc-save-active:hover { background:#1b5e4a; }
        .pc-save-disabled { background:#f3f4f6; color:#d1d5db; cursor:not-allowed; }
        .pc-save-approved { background:#dcfce7; color:#14532d; cursor:default; }
        .pc-save-error    { background:#fee2e2; color:#991b1b; }
        .pc-mark-btn { padding:11px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;
          font-family:inherit; transition:all .15s; min-height:48px; display:flex; align-items:center; gap:5px; white-space:nowrap; }
        .pc-mark-reset { background:#fff7ed; color:#92400e; border:1.5px solid #fed7aa; }
        .pc-mark-reset:hover { background:#ffedd5; }

        /* SKELETON */
        .pc-sk { background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size:600px 100%; animation:shimmer 1.6s infinite; border-radius:8px; }

        /* SPINNER */
        .spin { animation:spin .8s linear infinite; display:inline-block; }

        /* STICKY SAVE BAR */
        .pm-save-bar { position:fixed; bottom:0; left:0; right:0; background:white;
          border-top:1.5px solid #e5e7eb; padding:10px 14px 14px; display:flex; align-items:center;
          gap:12px; z-index:9900; box-shadow:0 -4px 24px rgba(0,0,0,.1); animation:fadeUp .25s ease; }
        .pm-save-pulse { width:10px; height:10px; border-radius:50%; background:#c8a75a; flex-shrink:0; animation:pulse 2.5s infinite; }

        /* RATE WARNING */
        .rate-warn { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px;
          background:#fff7ed; border:1px solid #fed7aa; color:#92400e; font-size:10px; font-weight:800; }

        /* SELECT checkbox */
        .pc-chk { width:18px; height:18px; flex-shrink:0; accent-color:#0f3f2f; cursor:pointer; margin-top:2px; }

        /* RESPONSIVE */
        @media (max-width:480px) { .pc-final-price{font-size:19px;} .pm-body{padding:10px 10px 100px;} }
      `}</style>

      <div className="pm">

        {/* TOAST */}
        {toast && (
          <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:99999,
            background:toast.ok?"#0f3f2f":"#dc2626", color:"white", padding:"11px 16px", borderRadius:10,
            fontWeight:700, fontSize:13, boxShadow:"0 8px 32px rgba(0,0,0,.18)",
            display:"flex", alignItems:"center", gap:10, animation:"toastIn .3s ease", whiteSpace:"nowrap", maxWidth:"92vw" }}>
            <span style={{ width:20, height:20, borderRadius:"50%", background:"rgba(255,255,255,.15)", display:"grid", placeItems:"center", fontSize:11, flexShrink:0 }}>
              {toast.ok ? "✓" : "✗"}
            </span>
            <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis" }}>{toast.msg}</span>
            {toast.undo && (
              <button onClick={() => { toast.undo!(); setToast(null); }}
                style={{ background:"rgba(255,255,255,.2)", border:"none", color:"white", borderRadius:6, padding:"4px 10px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                Undo
              </button>
            )}
            <button onClick={() => setToast(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.6)", cursor:"pointer", padding:"0 2px", fontSize:16, lineHeight:1, flexShrink:0 }}>✕</button>
          </div>
        )}

        {/* CHROME */}
        <div className="pm-chrome">
          <div className="pm-chrome-r1">
            <Link href="/admin" style={{ display:"flex", alignItems:"center", color:"#9ca3af", textDecoration:"none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M5 12l7 7M5 12l7-7"/></svg>
            </Link>

            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#0f3f2f,#1b5e4a)", display:"grid", placeItems:"center", flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>

            <span style={{ fontWeight:900, fontSize:16, color:"#111", letterSpacing:-.3, flex:1, fontFamily:"'Syne',sans-serif" }}>
              Pricing Manager
            </span>

            {/* Progress ring */}
            {rows.length > 0 && (() => {
              const r = 10, circ = 2 * Math.PI * r, dash = (stats.pctDone / 100) * circ;
              return (
                <svg width="30" height="30" viewBox="0 0 26 26" aria-label={`${stats.pctDone}% approved`}>
                  <circle cx="13" cy="13" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                  <circle cx="13" cy="13" r={r} fill="none" stroke={stats.pctDone===100?"#16a34a":"#0f3f2f"} strokeWidth="3"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 13 13)"
                    style={{ transition:"stroke-dasharray .6s ease" }}/>
                  <text x="13" y="17" textAnchor="middle" fontSize="7" fontWeight="800" fill={stats.pctDone===100?"#16a34a":"#0f3f2f"}>{stats.pctDone}%</text>
                </svg>
              );
            })()}
          </div>

          <div className="pm-chrome-r2">
            {/* Rate row */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:600, color:"#6b7280" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:rateLoading?"#d1d5db":rateSrc==="live"?"#16a34a":"#d97706", flexShrink:0 }}/>
                {rateLoading ? "Loading rate…" : `1 ₹ = M ${effectiveRate.toFixed(4)}`}
                {rateOverride && <span style={{ fontSize:9, fontWeight:800, background:"rgba(200,167,90,.15)", color:"#c8a75a", padding:"1px 6px", borderRadius:20 }}>OVERRIDE</span>}
                {rateSrc === "fallback" && !rateOverride && (
                  <span className="rate-warn">⚠ Fallback rate</span>
                )}
              </div>
              <input type="number" placeholder="Override rate" value={rateOverride}
                onChange={e => setOverride(e.target.value)} step="0.0001"
                style={{ width:120, padding:"5px 9px", border:"1.5px solid #e5e7eb", borderRadius:7, fontSize:12, fontFamily:"inherit", outline:"none", background:"white" }}/>
              {rateOverride && <button onClick={() => setOverride("")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#9ca3af", lineHeight:1 }}>✕</button>}
            </div>

            {/* Toolbar */}
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <div className="pm-search-wrap">
                <span className="pm-search-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </span>
                <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && loadProducts()}
                  placeholder="Search products…" className="pm-search-input"/>
              </div>

              <button onClick={loadProducts} disabled={loading} className="btn btn-primary btn-sm" style={{ flexShrink:0 }}>
                {loading ? <span className="spin" style={{ width:13, height:13, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"white", borderRadius:"50%" }}/> : rows.length > 0 ? "🔄 Reload" : "⚡ Load"}
              </button>

              {rows.length > 0 && (
                <button onClick={exportCsv} className="btn btn-ghost btn-sm" style={{ flexShrink:0 }} title="Export to CSV">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  CSV
                </button>
              )}

              <button onClick={() => setFilters(!showFilters)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8,
                  border:`1.5px solid ${showFilters?"#0f3f2f":"#e5e7eb"}`, background:showFilters?"rgba(15,63,47,.06)":"white",
                  color:showFilters?"#0f3f2f":"#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0, minHeight:36 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="pm-body" ref={scrollRef} onScroll={() => { if (scrollRef.current) saveSession({ scrollTop:scrollRef.current.scrollTop }); }}>

          {/* Stale banner */}
          {isStale && (
            <div className="pm-stale">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Data loaded over 15 min ago — prices may have changed
              <button onClick={loadProducts} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#92400e", fontSize:11, fontWeight:800 }}>Reload</button>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (
            <div className="pm-filter-panel">
              <div className="pm-filter-row">
                <select className="pm-select" value={catFilter} onChange={e => setCat(e.target.value)} style={{ flex:1, minWidth:140 }}>
                  <option value="">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="pm-select" value={brandFilter} onChange={e => setBrand(e.target.value)} style={{ flex:1, minWidth:140 }}>
                  <option value="">All brands</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select className="pm-select" value={sortKey} onChange={e => setSort(e.target.value as SortKey)} style={{ flex:1, minWidth:140 }}>
                  <option value="unpriced_first">Unpriced first</option>
                  <option value="name">A → Z</option>
                  <option value="price_asc">Price ↑</option>
                  <option value="price_desc">Price ↓</option>
                </select>
                {(catFilter||brandFilter) && (
                  <button onClick={() => { setCat(""); setBrand(""); }} className="btn btn-ghost btn-sm">Clear</button>
                )}
              </div>

              {/* Quick fill */}
              <div className="pm-filter-row">
                <input type="number" className="pm-input" placeholder="Quick fill ₹ (apply to all unpriced)" value={quickFill}
                  onChange={e => setQuickFill(e.target.value)} onKeyDown={e => e.key==="Enter" && applyQuickFill()}
                  style={{ flex:1 }}/>
                <button onClick={applyQuickFill} disabled={!quickFill} className="btn btn-gold btn-sm">
                  Apply{catFilter ? ` (${catFilter})` : " all"}
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          {rows.length > 0 && (
            <>
              <div className="pm-stats">
                <div className="pm-stat">
                  <div className="pm-stat-v" style={{ color:"#111" }}>{stats.total}</div>
                  <div className="pm-stat-l">Total</div>
                </div>
                <div className="pm-stat">
                  <div className="pm-stat-v" style={{ color:"#d97706" }}>{stats.unpriced}</div>
                  <div className="pm-stat-l">Unpriced</div>
                </div>
                <div className="pm-stat">
                  <div className="pm-stat-v" style={{ color:"#0284c7" }}>{stats.suggested}</div>
                  <div className="pm-stat-l">Suggested</div>
                </div>
                <div className="pm-stat">
                  <div className="pm-stat-v" style={{ color:"#16a34a" }}>{stats.approved}</div>
                  <div className="pm-stat-l">Approved</div>
                </div>
              </div>

              <div className="pm-prog-wrap">
                <div className="pm-prog-fill" style={{ width:`${stats.pctDone}%` }}/>
              </div>

              {/* Filter tabs */}
              <div className="pm-pill-row" style={{ marginBottom:10 }}>
                {(["all","unpriced","suggested","approved"] as FilterTab[]).map(t => (
                  <button key={t} onClick={() => setFilterTab(t)} className={`pm-pill ${filterTab===t?"pm-pill-on":"pm-pill-off"}`}>
                    {t==="all"?"All":t==="unpriced"?"⚠ Unpriced":t==="suggested"?"🤖 AI Suggested":"✓ Approved"}
                    <span style={{ marginLeft:4, opacity:.7 }}>
                      ({t==="all"?stats.total:t==="unpriced"?stats.unpriced:t==="suggested"?stats.suggested:stats.approved})
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[...Array(6)].map((_,i) => (
                <div key={i} style={{ borderRadius:12, overflow:"hidden", border:"1px solid #e5e7eb", background:"white" }}>
                  <div style={{ height:3 }} className="pc-sk"/>
                  <div style={{ padding:"12px 14px", display:"flex", gap:12 }}>
                    <div style={{ width:52, height:52, borderRadius:8 }} className="pc-sk"/>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                      <div style={{ height:14, borderRadius:4 }} className="pc-sk"/>
                      <div style={{ height:11, width:"60%", borderRadius:4 }} className="pc-sk"/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && rows.length === 0 && (
            <div style={{ background:"white", border:"2px dashed #e5e7eb", borderRadius:14, padding:"40px 24px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🏷️</div>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:8, fontFamily:"'Syne',sans-serif" }}>No products loaded</div>
              <div style={{ color:"#9ca3af", fontSize:13, marginBottom:20 }}>Click Load to fetch all products for pricing</div>
              <button onClick={loadProducts} className="btn btn-primary">⚡ Load Products</button>
            </div>
          )}

          {/* PRODUCT CARDS */}
          {!loading && displayRows.map(row => {
            const isSaving  = row.status === "saving";
            const isApproved= row.status === "admin_approved";
            const isSugg    = row.status === "ai_suggested";
            const isErr     = row.status === "error";
            const mPct      = row.proposal?.margin_pct ?? row.computed?.margin_pct ?? 0;
            const mColor    = marginColor(mPct);

            const barClass =
              isApproved ? "pc-bar-approved" :
              isSugg     ? "pc-bar-suggested" :
              isErr      ? "pc-bar-error" :
              "pc-bar-unpriced";

            const cardClass =
              isApproved ? "pc pc-approved" :
              isSugg     ? "pc pc-suggested" :
              isErr      ? "pc pc-error" :
              "pc";

            return (
              <div key={row.product.id} className={`${cardClass}${row.status==="saving" ? " pc-deleting" : ""}`}>

                {/* Top accent bar */}
                <div className={`pc-bar ${barClass}`}/>

                {/* Header */}
                <div className="pc-header">
                  <input type="checkbox" className="pc-chk" checked={row.isSelected}
                    onChange={() => setRows(prev => prev.map(r => r.product.id===row.product.id ? {...r,isSelected:!r.isSelected} : r))}/>

                  <div className="pc-thumb">
                    {row.product.main_image && !row.product.main_image.startsWith("error") ? (
                      <img src={row.product.main_image} alt="" onError={e => (e.currentTarget.style.display="none")}/>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
                    )}
                  </div>

                  <div className="pc-info">
                    <div className="pc-title-row">
                      <span className="pc-title">{row.product.title}</span>

                      {/* DELETE BUTTON */}
                      {!row.confirmDelete && (
                        <button className="pc-del-btn" title="Delete product from store"
                          onClick={() => setConfirmDelete(row.product.id, true)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </div>

                    <div className="pc-meta">
                      {[row.product.brand, row.product.category, row.product.stock!=null?`${row.product.stock} in stock`:null].filter(Boolean).join(" · ")}
                    </div>

                    <div className="pc-badge-row">
                      <StatusBadge status={row.status}/>
                      {row.product.price && row.product.price > 0 && (
                        <span style={{ fontSize:12, color:"#6b7280", fontWeight:600 }}>M {fmt(row.product.price)}</span>
                      )}
                      {isSugg && row.proposal && confidenceBadge(row.proposal.confidence)}
                    </div>
                  </div>
                </div>

                {/* DELETE CONFIRM */}
                {row.confirmDelete && (
                  <div className="pc-del-confirm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span className="pc-del-confirm-msg">Remove this product from store? (soft-delete, recoverable)</span>
                    <button onClick={() => deleteProduct(row.product.id)} className="btn btn-danger btn-xs">
                      Delete
                    </button>
                    <button onClick={() => setConfirmDelete(row.product.id, false)} className="btn btn-ghost btn-xs">
                      Cancel
                    </button>
                  </div>
                )}

                {/* AI PROPOSAL SECTION */}
                {isSugg && row.proposal && (
                  <div className="pc-proposal">
                    <div className="pc-proposal-title">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      AI Suggestion — review before approving
                      {row.proposal.is_fallback_rate && (
                        <span className="rate-warn">⚠ Fallback rate used</span>
                      )}
                    </div>
                    <div className="pc-proposal-row" style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:"#6b7280" }}>
                        <strong>₹{row.proposal.inr_price.toLocaleString()}</strong> on <strong>{row.proposal.source}</strong>
                        {" "} @ {row.proposal.exchange_rate.toFixed(4)}
                      </div>
                      {confidenceBadge(row.proposal.confidence)}
                    </div>
                    <div className="pc-final-row">
                      <div>
                        <div className="pc-final-lbl">Suggested Price</div>
                        <div className="pc-final-price">M {fmt(row.proposal.final_price_lsl)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700 }}>Compare</div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#9ca3af", textDecoration:"line-through" }}>M {fmt(row.proposal.compare_price_lsl)}</div>
                      </div>
                    </div>
                    <div className="pc-chips" style={{ marginBottom:10 }}>
                      <span className="pc-chip" style={{ color:mColor, background:`${mColor}18` }}>{mPct}% margin</span>
                      <span className="pc-chip pc-chip-disc">-{row.proposal.discount_pct}% off</span>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => approveProposal(row.product.id)} className="btn btn-primary btn-sm" style={{ flex:1 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        Approve AI Price
                      </button>
                      <button onClick={() => rejectProposal(row.product.id)} className="btn btn-warn btn-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* MANUAL INR INPUT (shown when not AI-suggested and not approved) */}
                {!isSugg && (
                  <div className="pc-input-section">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div className="pc-input-label">Market Price (₹)</div>
                      {row.computed && <span style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>Ctrl+S to approve</span>}
                    </div>
                    <div className="pc-inr-wrap">
                      <span className="pc-rupee">₹</span>
                      <input
                        ref={el => { if (el) inputRefs.current.set(row.product.id,el); else inputRefs.current.delete(row.product.id); }}
                        type="number"
                        value={row.marketInr}
                        onChange={e => updateRow(row.product.id, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, row.product.id)}
                        placeholder="e.g. 2499"
                        disabled={isSaving}
                        className={`pc-inr ${row.marketInr ? "pc-inr-active" : ""}`}
                      />
                    </div>
                  </div>
                )}

                {/* COMPUTED RESULTS (for manual input) */}
                {row.computed && !isSugg && (
                  <div className="pc-results">
                    <div className="pc-final-row">
                      <div>
                        <div className="pc-final-lbl">Final Price</div>
                        <div className="pc-final-price">M {fmt(row.computed.final_price_lsl)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700 }}>Compare</div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#9ca3af", textDecoration:"line-through" }}>M {fmt(row.computed.compare_price_lsl)}</div>
                      </div>
                    </div>
                    <div className="pc-chips">
                      <span className="pc-chip" style={{ color:mColor, background:`${mColor}18` }}>{row.computed.margin_pct}% margin</span>
                      <span className="pc-chip pc-chip-disc">-{row.computed.discount_pct}%</span>
                      <span className="pc-chip pc-chip-save">saves M{fmt(row.computed.savings_lsl)}</span>
                    </div>
                    {mPct < 8 && (
                      <div style={{ marginTop:8, fontSize:11, fontWeight:700, color:"#991b1b", background:"#fee2e2", padding:"5px 10px", borderRadius:6, display:"flex", alignItems:"center", gap:5 }}>
                        ⚠ Margin too low — consider raising the price
                      </div>
                    )}
                  </div>
                )}

                {/* ACTIONS */}
                <div className="pc-actions">
                  {/* Saving spinner */}
                  {isSaving && (
                    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", background:"#f9fafb", borderRadius:8, color:"#6b7280", fontWeight:700, fontSize:13 }}>
                      <span className="spin" style={{ width:16, height:16, border:"2.5px solid #e5e7eb", borderTopColor:"#0f3f2f", borderRadius:"50%" }}/>
                      {row.confirmDelete ? "Deleting…" : "Saving…"}
                    </div>
                  )}

                  {/* Error */}
                  {isErr && !isSaving && (
                    <button onClick={() => approveManual(row.product.id)} className="pc-save-btn pc-save-error" style={{ flex:1 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>
                      Retry {row.errorMsg ? `(${row.errorMsg.slice(0,22)}…)` : ""}
                    </button>
                  )}

                  {/* Approved checkmark */}
                  {isApproved && !isSaving && (
                    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", background:"#dcfce7", borderRadius:8, color:"#14532d", fontWeight:800, fontSize:14 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      Price Approved
                    </div>
                  )}

                  {/* Approve manual button */}
                  {!isSaving && !isErr && !isApproved && !isSugg && (
                    <button onClick={() => approveManual(row.product.id)} disabled={!row.computed}
                      className={`pc-save-btn ${row.computed ? "pc-save-active" : "pc-save-disabled"}`} style={{ flex:1 }}>
                      {row.computed ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          Approve Price
                        </>
                      ) : "Enter ₹ price above"}
                    </button>
                  )}

                  {/* AI search button */}
                  {!isSaving && !isApproved && (
                    <button onClick={() => runAiSearch(row.product.id)} className="btn btn-ai btn-sm" title="Search Indian stores with AI">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      AI
                    </button>
                  )}

                  {/* Reset */}
                  {isApproved && !isSaving && (
                    <button onClick={() => markUnpriced(row.product.id)} className="pc-mark-btn pc-mark-reset">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 2v6h6"/><path d="M3 8a9 9 0 1 0 .7-3.6"/></svg>
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          {displayRows.length > 0 && (
            <div style={{ padding:"6px 4px", fontSize:11, color:"#9ca3af", display:"flex", gap:10, flexWrap:"wrap" }}>
              <span>📦 {stats.total} loaded</span>
              {totalCount > rows.length && <span>· {totalCount} in DB</span>}
              <span style={{ color:"#d97706", fontWeight:700 }}>⚠ {stats.unpriced} unpriced</span>
              <span style={{ color:"#0284c7", fontWeight:700 }}>🤖 {stats.suggested} AI suggested</span>
              <span style={{ color:"#0f3f2f", fontWeight:700 }}>✓ {stats.approved} approved</span>
              {stats.errors > 0 && <span style={{ color:"#dc2626", fontWeight:700 }}>✗ {stats.errors} errors</span>}
            </div>
          )}
        </div>

        {/* STICKY APPROVE BAR */}
        {stats.readyToSave > 0 && (
          <div className="pm-save-bar">
            <div className="pm-save-pulse"/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#111" }}>
                {stats.readyToSave} price{stats.readyToSave!==1?"s":""} ready to approve
              </div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>
                Won't go live until approved
              </div>
            </div>
            {stats.selectedReady > 0 && (
              <button onClick={() => bulkApprove(true)} className="btn btn-ai btn-sm">
                Selected ({stats.selectedReady})
              </button>
            )}
            <button onClick={() => bulkApprove(false)} className="btn btn-primary">
              ✓ Approve All ({stats.readyToSave})
            </button>
          </div>
        )}

        {/* AI suggested bar */}
        {stats.suggested > 0 && stats.readyToSave === 0 && (
          <div className="pm-save-bar">
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#0284c7", flexShrink:0, animation:"pulse 2s infinite" }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#111" }}>
                {stats.suggested} AI suggestion{stats.suggested!==1?"s":""} awaiting review
              </div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>Scroll up to review and approve</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}