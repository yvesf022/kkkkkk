"use client";

/**
 * FILE: app/admin/auto-pricer/page.tsx
 *
 * 🤖 AI AUTO-PRICER — Karabo's Store
 *
 * HOW IT WORKS:
 *  1. Loads all unpriced products from your backend (same endpoint as pricing tool)
 *  2. For each product, uses Claude AI (via Anthropic API) to search Google India
 *     and extract the real INR market price
 *  3. Runs the same calculatePrice() formula as your pricing tool
 *  4. Lets you review every price before saving
 *  5. On confirm — calls pricingApi.bulkApply() to save prices directly to DB
 *     (identical to how your pricing-page.tsx saves them)
 *
 * INTEGRATION: Uses the same imports as pricing-page.tsx:
 *   adminTokenStorage, calculatePrice, exchangeApi, pricingApi
 */

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { adminTokenStorage, calculatePrice, exchangeApi, pricingApi } from "@/lib/api";
import type { ProductListItem } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "";

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */
type SearchStatus = "idle" | "searching" | "found" | "not_found" | "error";

type PricedRow = {
  product: ProductListItem;
  inrFound: number | null;
  inrSource: string;
  inrConfidence: "high" | "medium" | "low" | null;
  result: ReturnType<typeof calculatePrice> | null;
  status: SearchStatus;
  errorMsg?: string;
  isSelected: boolean;
  saveState: "unsaved" | "saving" | "saved" | "error";
};

type RunState = "idle" | "running" | "paused" | "done";

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const fmt = (n: number, d = 2) => n.toFixed(d);

function confidencePill(c: "high" | "medium" | "low") {
  const map = {
    high:   { label: "High confidence",   bg: "#dcfce7", color: "#14532d" },
    medium: { label: "Medium confidence", bg: "#fef3c7", color: "#92400e" },
    low:    { label: "Low confidence",    bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[c];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════
   AI PRICE SEARCH
   Calls Claude via Anthropic API to search Google
   India for the product's real INR price
══════════════════════════════════════════════ */
async function searchProductPriceINR(
  productTitle: string,
  brand: string | null | undefined,
  category: string | null | undefined
): Promise<{ inr: number; source: string; confidence: "high" | "medium" | "low" }> {

  const query = [brand, productTitle, category].filter(Boolean).join(" ");

  const prompt = `You are a price research assistant for an online store in Lesotho that sources products from India.

Search for the current retail price of this product on Indian e-commerce sites (Amazon.in, Flipkart, Nykaa, Meesho, etc):

Product: "${query}"

Instructions:
1. Find the most common/average retail price in Indian Rupees (₹) on Indian websites
2. Prefer prices from Amazon.in, Flipkart.com, or Nykaa.com as they are most reliable
3. Return ONLY a JSON object with no extra text, in this exact format:
{
  "inr_price": <number>,
  "source": "<website name where you found the price>",
  "confidence": "<high|medium|low>",
  "notes": "<brief note about the price, e.g. 'Found on Amazon.in, 3 sellers'>"
}

Rules:
- confidence = "high" if you found the exact product on a major Indian retailer
- confidence = "medium" if you found a similar product or less reliable source
- confidence = "low" if you are estimating based on product category
- If you truly cannot find any price, return: {"inr_price": null, "source": "not found", "confidence": "low", "notes": "Product not found on Indian sites"}
- Return ONLY the JSON, nothing else`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();

  // Extract text from response (may include tool_use blocks)
  const text = data.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.inr_price) throw new Error("Price not found");

  return {
    inr: parseFloat(parsed.inr_price),
    source: parsed.source || "Unknown",
    confidence: parsed.confidence || "low",
  };
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function AutoPricerPage() {

  const [rate, setRate]               = useState(0.21);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateOverride, setOverride]   = useState("");
  const effectiveRate = rateOverride ? (parseFloat(rateOverride) || rate) : rate;

  const [rows, setRows]               = useState<PricedRow[]>([]);
  const [loadingProducts, setLoading] = useState(false);
  const [runState, setRunState]       = useState<RunState>("idle");
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [bulkSaving, setBulkSaving]   = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [searchQ, setSearchQ]         = useState("");
  const [onlyUnpriced, setUnpricedOnly] = useState(true);
  const [concurrency, setConcurrency] = useState(1); // 1 = sequential, safer
  const [delayMs, setDelayMs]         = useState(1200); // delay between searches

  const pauseRef    = useRef(false);
  const cancelRef   = useRef(false);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Exchange rate ──
  useEffect(() => {
    exchangeApi.getINRtoLSL()
      .then(({ rate: r }) => setRate(r))
      .finally(() => setRateLoading(false));
  }, []);

  const showToast = (msg: string, ok = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Load products ──
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQ) params.search = searchQ;
      if (onlyUnpriced) params.unpriced_only = "true";
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(
        `${BACKEND}/api/products/admin/pricing/all${qs ? `?${qs}` : ""}`,
        { headers: { Authorization: `Bearer ${adminTokenStorage.get() ?? ""}` } }
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const products: ProductListItem[] = data.results ?? [];
      setRows(products.map(p => ({
        product: p,
        inrFound: null,
        inrSource: "",
        inrConfidence: null,
        result: null,
        status: "idle",
        isSelected: true,
        saveState: "unsaved",
      })));
      setRunState("idle");
      setCurrentIdx(0);
      cancelRef.current = false;
      pauseRef.current = false;
      showToast(`Loaded ${products.length} products`);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load products", false);
    } finally {
      setLoading(false);
    }
  }, [searchQ, onlyUnpriced]);

  // ── RUN: search prices for all selected products ──
  const runAutoPrice = useCallback(async () => {
    cancelRef.current = false;
    pauseRef.current = false;
    setRunState("running");

    const selected = rows.filter(r => r.isSelected && r.status !== "found");

    for (let i = 0; i < selected.length; i++) {
      if (cancelRef.current) break;

      // Wait while paused
      while (pauseRef.current) {
        await new Promise(r => setTimeout(r, 300));
        if (cancelRef.current) break;
      }
      if (cancelRef.current) break;

      const row = selected[i];
      const id = row.product.id;
      setCurrentIdx(i);

      // Mark as searching
      setRows(prev => prev.map(r =>
        r.product.id === id ? { ...r, status: "searching" } : r
      ));

      try {
        const { inr, source, confidence } = await searchProductPriceINR(
          row.product.title,
          row.product.brand,
          row.product.category
        );

        const result = calculatePrice({ market_price_inr: inr, exchange_rate: effectiveRate });

        setRows(prev => prev.map(r =>
          r.product.id === id ? {
            ...r,
            inrFound: inr,
            inrSource: source,
            inrConfidence: confidence,
            result,
            status: "found",
          } : r
        ));
      } catch (e: any) {
        setRows(prev => prev.map(r =>
          r.product.id === id ? {
            ...r,
            status: e?.message?.includes("not found") ? "not_found" : "error",
            errorMsg: e?.message,
          } : r
        ));
      }

      // Delay between searches to avoid rate limiting
      if (i < selected.length - 1 && !cancelRef.current) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    if (!cancelRef.current) setRunState("done");
    else setRunState("idle");
  }, [rows, effectiveRate, delayMs]);

  // ── Recalculate if exchange rate changes ──
  useEffect(() => {
    setRows(prev => prev.map(r => {
      if (!r.inrFound) return r;
      return { ...r, result: calculatePrice({ market_price_inr: r.inrFound, exchange_rate: effectiveRate }) };
    }));
  }, [effectiveRate]);

  // ── Manual override for a single row ──
  const overrideInr = (id: string, val: string) => {
    const v = parseFloat(val);
    setRows(prev => prev.map(r => {
      if (r.product.id !== id) return r;
      if (!isNaN(v) && v > 0) {
        return { ...r, inrFound: v, result: calculatePrice({ market_price_inr: v, exchange_rate: effectiveRate }), status: "found", saveState: "unsaved" };
      }
      return { ...r, inrFound: null, result: null, status: "idle" };
    }));
  };

  // ── Retry single product ──
  const retryRow = async (id: string) => {
    const row = rows.find(r => r.product.id === id);
    if (!row) return;
    setRows(prev => prev.map(r => r.product.id === id ? { ...r, status: "searching" } : r));
    try {
      const { inr, source, confidence } = await searchProductPriceINR(row.product.title, row.product.brand, row.product.category);
      const result = calculatePrice({ market_price_inr: inr, exchange_rate: effectiveRate });
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, inrFound: inr, inrSource: source, inrConfidence: confidence, result, status: "found", saveState: "unsaved" } : r));
    } catch (e: any) {
      setRows(prev => prev.map(r => r.product.id === id ? { ...r, status: "error", errorMsg: e?.message } : r));
    }
  };

  // ── Save all found prices to DB (same as pricing-page.tsx bulkApply) ──
  const saveAll = async () => {
    const toSave = rows.filter(r => r.result && r.isSelected && r.saveState === "unsaved");
    if (!toSave.length) { showToast("Nothing to save", false); return; }
    setBulkSaving(true);
    setRows(prev => prev.map(r =>
      toSave.some(t => t.product.id === r.product.id) ? { ...r, saveState: "saving" } : r
    ));

    const items = toSave.map(r => ({
      product_id: r.product.id,
      price_lsl: r.result!.final_price_lsl,
      compare_price_lsl: r.result!.compare_price_lsl,
    }));

    try {
      const res = await pricingApi.bulkApply(items);

      // Mark as priced in DB
      const succeededIds = toSave
        .filter(r => !res.errors?.some((e: string) => e.startsWith(r.product.id)))
        .map(r => r.product.id);

      if (succeededIds.length > 0) {
        fetch(`${BACKEND}/api/products/admin/pricing/bulk-mark`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminTokenStorage.get() ?? ""}` },
          body: JSON.stringify({ product_ids: succeededIds, is_priced: true }),
        }).catch(() => {});
      }

      setRows(prev => prev.map(r => {
        const wasSaving = toSave.some(t => t.product.id === r.product.id);
        if (!wasSaving) return r;
        const failed = res.errors?.some((e: string) => e.startsWith(r.product.id));
        return { ...r, saveState: failed ? "error" : "saved" };
      }));
      showToast(`✓ ${res.success ?? succeededIds.length} prices saved to your store!`);
    } catch (e: any) {
      showToast(e?.message ?? "Save failed", false);
      setRows(prev => prev.map(r =>
        r.saveState === "saving" ? { ...r, saveState: "error" } : r
      ));
    } finally {
      setBulkSaving(false);
    }
  };

  /* ── STATS ── */
  const stats = {
    total:     rows.length,
    selected:  rows.filter(r => r.isSelected).length,
    found:     rows.filter(r => r.status === "found").length,
    searching: rows.filter(r => r.status === "searching").length,
    notFound:  rows.filter(r => r.status === "not_found").length,
    errors:    rows.filter(r => r.status === "error").length,
    saved:     rows.filter(r => r.saveState === "saved").length,
    readyToSave: rows.filter(r => r.result && r.isSelected && r.saveState === "unsaved").length,
    progress:  rows.length > 0 ? Math.round((rows.filter(r => r.status === "found" || r.status === "not_found" || r.saveState === "saved").length / rows.length) * 100) : 0,
  };

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }

        .ap * { box-sizing: border-box; }
        .ap {
          min-height: 100dvh;
          background: #050e08;
          color: #f0f0f0;
          font-family: 'DM Mono', 'Courier New', monospace;
          display: flex;
          flex-direction: column;
        }

        /* ── HEADER ── */
        .ap-header {
          background: linear-gradient(135deg, #071610 0%, #0a1f14 100%);
          border-bottom: 1px solid rgba(200,167,90,0.2);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .ap-logo {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #c8a75a, #b8973e);
          border-radius: 10px;
          display: grid; place-items: center;
          font-size: 20px; font-weight: 900;
          color: #050e08;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(200,167,90,0.3);
        }

        .ap-title-wrap { flex: 1; min-width: 0; }
        .ap-title {
          font-size: 16px; font-weight: 900;
          color: #f0f0f0; letter-spacing: -0.3px;
          display: flex; align-items: center; gap: 8px;
        }
        .ap-subtitle { font-size: 11px; color: rgba(200,167,90,0.7); margin-top: 2px; letter-spacing: 1px; }

        .ap-live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          animation: pulse 1.5s infinite;
          flex-shrink: 0;
        }

        /* ── BODY ── */
        .ap-body { flex: 1; padding: 16px 16px 100px; max-width: 900px; margin: 0 auto; width: 100%; }

        /* ── CONTROL PANEL ── */
        .ap-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(200,167,90,0.15);
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 16px;
        }
        .ap-panel-title {
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: rgba(200,167,90,0.8);
          margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
        }

        /* ── INPUTS ── */
        .ap-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px; font-family: inherit;
          color: #f0f0f0;
          outline: none;
          width: 100%;
          transition: border-color 0.2s;
        }
        .ap-input:focus { border-color: rgba(200,167,90,0.6); }
        .ap-input::placeholder { color: rgba(255,255,255,0.2); }

        /* ── BUTTONS ── */
        .ap-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          padding: 11px 20px; border-radius: 9px;
          font-size: 13px; font-weight: 800; font-family: inherit;
          border: none; cursor: pointer; transition: all 0.15s;
          white-space: nowrap; letter-spacing: 0.3px;
        }
        .ap-btn:active:not(:disabled) { transform: scale(0.97); }
        .ap-btn-gold { background: linear-gradient(135deg, #c8a75a, #b8973e); color: #050e08; box-shadow: 0 4px 14px rgba(200,167,90,0.3); }
        .ap-btn-gold:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(200,167,90,0.5); }
        .ap-btn-gold:disabled { opacity: 0.4; cursor: not-allowed; }
        .ap-btn-green { background: #0f3f2f; color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
        .ap-btn-green:hover:not(:disabled) { background: #1b5e4a; }
        .ap-btn-green:disabled { opacity: 0.4; cursor: not-allowed; }
        .ap-btn-ghost { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); }
        .ap-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: white; }
        .ap-btn-danger { background: rgba(220,38,38,0.15); color: #fca5a5; border: 1px solid rgba(220,38,38,0.3); }
        .ap-btn-sm { padding: 7px 14px; font-size: 11px; border-radius: 7px; }

        /* ── PROGRESS BAR ── */
        .ap-progress-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; }
        .ap-progress-fill  { height: 100%; border-radius: 10px; background: linear-gradient(90deg, #c8a75a, #4ade80); transition: width 0.5s ease; }

        /* ── STATS STRIP ── */
        .ap-stats {
          display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
        }
        .ap-stat {
          flex: 1; min-width: 72px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 10px 12px;
          text-align: center;
        }
        .ap-stat-val { font-size: 22px; font-weight: 900; line-height: 1; }
        .ap-stat-lbl { font-size: 9px; color: rgba(255,255,255,0.35); letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }

        /* ── PRODUCT CARD ── */
        .ap-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          margin-bottom: 10px;
          overflow: hidden;
          animation: fadeUp 0.25s ease both;
          transition: border-color 0.2s;
        }
        .ap-card:hover { border-color: rgba(200,167,90,0.2); }
        .ap-card-found { border-color: rgba(74,222,128,0.2); background: rgba(74,222,128,0.02); }
        .ap-card-error  { border-color: rgba(220,38,38,0.2); }
        .ap-card-saved  { border-color: rgba(200,167,90,0.3); background: rgba(200,167,90,0.03); }

        .ap-card-header {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 16px;
        }
        .ap-card-thumb {
          width: 44px; height: 44px; border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: grid; place-items: center;
          flex-shrink: 0; overflow: hidden;
        }
        .ap-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ap-card-info { flex: 1; min-width: 0; }
        .ap-card-title { font-size: 12px; font-weight: 700; color: #f0f0f0; line-height: 1.4; word-break: break-word; }
        .ap-card-meta  { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 3px; }

        /* Searching animation */
        .ap-scanning {
          position: relative;
          overflow: hidden;
          background: rgba(200,167,90,0.05);
          border: 1px solid rgba(200,167,90,0.15);
          border-radius: 8px;
          padding: 10px 14px;
        }
        .ap-scanning::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #c8a75a, transparent);
          animation: shimmer 1.2s infinite;
          background-size: 600px 100%;
        }
        .ap-scanning-text {
          font-size: 11px; color: rgba(200,167,90,0.8);
          display: flex; align-items: center; gap: 8px;
        }
        .ap-spin { animation: spin 0.8s linear infinite; display: inline-block; flex-shrink: 0; }

        /* Result panel */
        .ap-result {
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .ap-price-inr {
          font-size: 13px; font-weight: 700;
          color: rgba(200,167,90,0.9);
          display: flex; align-items: center; gap: 5px;
        }
        .ap-arrow { color: rgba(255,255,255,0.2); font-size: 14px; }
        .ap-price-lsl {
          font-size: 20px; font-weight: 900;
          color: #4ade80;
        }
        .ap-compare { font-size: 12px; color: rgba(255,255,255,0.25); text-decoration: line-through; }
        .ap-source { font-size: 10px; color: rgba(255,255,255,0.3); }

        /* Override input */
        .ap-override-wrap {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 16px;
          border-top: 1px solid rgba(255,255,255,0.04);
          background: rgba(255,255,255,0.02);
        }
        .ap-override-label { font-size: 10px; color: rgba(255,255,255,0.3); flex-shrink: 0; letter-spacing: 1px; text-transform: uppercase; }
        .ap-override-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 13px; font-weight: 700; font-family: inherit;
          color: #f0f0f0; width: 130px; outline: none;
        }
        .ap-override-input:focus { border-color: rgba(200,167,90,0.5); }

        /* ── STICKY BOTTOM BAR ── */
        .ap-save-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: rgba(7,22,16,0.97);
          border-top: 1px solid rgba(200,167,90,0.2);
          padding: 12px 20px 16px;
          display: flex; align-items: center; gap: 12px;
          backdrop-filter: blur(12px);
          z-index: 200;
          animation: fadeUp 0.3s ease;
        }

        /* ── TOAST ── */
        .ap-toast {
          position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
          z-index: 9999;
          padding: 11px 18px; border-radius: 10px;
          font-weight: 800; font-size: 13px; font-family: inherit;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: fadeUp 0.3s ease;
          white-space: nowrap;
        }

        .ap-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .ap-col { display: flex; flex-direction: column; gap: 6px; }
        .ap-label { font-size: 10px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; }

        .sk { background: linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:600px 100%; animation:shimmer 1.6s infinite; border-radius:6px; }
      `}</style>

      <div className="ap">

        {/* ── TOAST ── */}
        {toast && (
          <div className="ap-toast" style={{ background: toast.ok ? "#0f3f2f" : "#7f1d1d", color: toast.ok ? "#4ade80" : "#fca5a5", border: `1px solid ${toast.ok ? "rgba(74,222,128,0.3)" : "rgba(220,38,38,0.3)"}` }}>
            {toast.ok ? "✓" : "✗"} {toast.msg}
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="ap-header">
          <Link href="/admin/pricing" style={{ color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", textDecoration: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M5 12l7 7M5 12l7-7"/></svg>
          </Link>
          <div className="ap-logo">₹</div>
          <div className="ap-title-wrap">
            <div className="ap-title">
              Auto-Pricer
              {runState === "running" && <div className="ap-live-dot" />}
            </div>
            <div className="ap-subtitle">AI · GOOGLE INDIA · INR → MALOTI</div>
          </div>
          {/* Rate */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(200,167,90,0.7)" }}>
              {rateLoading ? "Loading…" : `₹1 = M ${effectiveRate.toFixed(4)}`}
            </span>
            <input
              type="number" step="0.0001" placeholder="Override"
              value={rateOverride}
              onChange={e => setOverride(e.target.value)}
              className="ap-input"
              style={{ width: 110, fontSize: 12 }}
            />
          </div>
        </div>

        <div className="ap-body">

          {/* ── CONTROL PANEL ── */}
          <div className="ap-panel">
            <div className="ap-panel-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
              Configuration
            </div>
            <div className="ap-row" style={{ marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="ap-label" style={{ marginBottom: 5 }}>Search products</div>
                <input
                  type="text" value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadProducts()}
                  placeholder="Filter by name, category…"
                  className="ap-input"
                />
              </div>
              <div>
                <div className="ap-label" style={{ marginBottom: 5 }}>Delay (ms)</div>
                <select value={delayMs} onChange={e => setDelayMs(Number(e.target.value))}
                  className="ap-input" style={{ width: 130 }}>
                  <option value={800}>Fast (800ms)</option>
                  <option value={1200}>Normal (1.2s)</option>
                  <option value={2000}>Safe (2s)</option>
                  <option value={3000}>Slow (3s)</option>
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.6)", cursor: "pointer", paddingTop: 18, flexShrink: 0 }}>
                <input type="checkbox" checked={onlyUnpriced} onChange={e => setUnpricedOnly(e.target.checked)}
                  style={{ accentColor: "#c8a75a", width: 14, height: 14 }} />
                Unpriced only
              </label>
            </div>
            <div className="ap-row">
              <button onClick={loadProducts} disabled={loadingProducts} className="ap-btn ap-btn-ghost">
                {loadingProducts
                  ? <><span className="ap-spin" style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "white", borderRadius: "50%" }} /> Loading…</>
                  : rows.length > 0 ? "🔄 Reload Products" : "📦 Load Products"}
              </button>

              {rows.length > 0 && runState === "idle" && (
                <button onClick={runAutoPrice} className="ap-btn ap-btn-gold">
                  🤖 Auto-Price {stats.selected} Products
                </button>
              )}
              {runState === "running" && (
                <>
                  <button onClick={() => { pauseRef.current = true; setRunState("paused"); }} className="ap-btn ap-btn-ghost">
                    ⏸ Pause
                  </button>
                  <button onClick={() => { cancelRef.current = true; }} className="ap-btn ap-btn-danger ap-btn-sm">
                    ✕ Stop
                  </button>
                </>
              )}
              {runState === "paused" && (
                <>
                  <button onClick={() => { pauseRef.current = false; setRunState("running"); runAutoPrice(); }} className="ap-btn ap-btn-gold">
                    ▶ Resume
                  </button>
                  <button onClick={() => { cancelRef.current = true; setRunState("idle"); }} className="ap-btn ap-btn-danger ap-btn-sm">
                    ✕ Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── PROGRESS ── */}
          {rows.length > 0 && (
            <>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                <span>Progress</span>
                <span style={{ color: "#c8a75a", fontWeight: 700 }}>{stats.progress}% — {stats.found} found / {rows.length} total</span>
              </div>
              <div className="ap-progress-track" style={{ marginBottom: 16 }}>
                <div className="ap-progress-fill" style={{ width: `${stats.progress}%` }} />
              </div>

              {/* Stats */}
              <div className="ap-stats">
                <div className="ap-stat">
                  <div className="ap-stat-val" style={{ color: "#c8a75a" }}>{stats.total}</div>
                  <div className="ap-stat-lbl">Total</div>
                </div>
                <div className="ap-stat">
                  <div className="ap-stat-val" style={{ color: "#4ade80" }}>{stats.found}</div>
                  <div className="ap-stat-lbl">Found</div>
                </div>
                <div className="ap-stat">
                  <div className="ap-stat-val" style={{ color: "#facc15" }}>{stats.notFound}</div>
                  <div className="ap-stat-lbl">Not Found</div>
                </div>
                <div className="ap-stat">
                  <div className="ap-stat-val" style={{ color: "#f87171" }}>{stats.errors}</div>
                  <div className="ap-stat-lbl">Errors</div>
                </div>
                <div className="ap-stat">
                  <div className="ap-stat-val" style={{ color: "#c8a75a" }}>{stats.saved}</div>
                  <div className="ap-stat-lbl">Saved</div>
                </div>
              </div>
            </>
          )}

          {/* ── PRODUCT CARDS ── */}
          {rows.length === 0 && !loadingProducts && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "rgba(255,255,255,0.5)" }}>AI Auto-Pricer Ready</div>
              <div style={{ fontSize: 12, maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>
                Load your products, then click <strong style={{ color: "#c8a75a" }}>Auto-Price</strong> — the AI will search Google India for each product's price, convert to Maloti, and prepare everything for review before saving.
              </div>
            </div>
          )}

          {loadingProducts && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="ap-card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div className="sk" style={{ width: 44, height: 44, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="sk" style={{ width: "65%", height: 12, marginBottom: 8 }} />
                      <div className="sk" style={{ width: "35%", height: 10 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rows.map((row, i) => {
            const isSearching = row.status === "searching";
            const isFound     = row.status === "found";
            const isError     = row.status === "error";
            const isNotFound  = row.status === "not_found";
            const isSaved     = row.saveState === "saved";

            const initials = ((row.product.brand || row.product.title || "?")
              .trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase());

            return (
              <div
                key={row.product.id}
                className={`ap-card ${isFound || isSaved ? "ap-card-found" : ""} ${isError ? "ap-card-error" : ""} ${isSaved ? "ap-card-saved" : ""}`}
                style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
              >
                {/* Card header */}
                <div className="ap-card-header">
                  <input type="checkbox" checked={row.isSelected}
                    onChange={() => setRows(prev => prev.map(r => r.product.id === row.product.id ? { ...r, isSelected: !r.isSelected } : r))}
                    style={{ accentColor: "#c8a75a", width: 14, height: 14, flexShrink: 0 }} />

                  <div className="ap-card-thumb">
                    {(row.product as any).main_image
                      ? <img src={(row.product as any).main_image} alt={row.product.title} loading="lazy" />
                      : <span style={{ fontSize: 13, fontWeight: 900, color: "#c8a75a" }}>{initials}</span>}
                  </div>

                  <div className="ap-card-info">
                    <div className="ap-card-title">{row.product.title}</div>
                    <div className="ap-card-meta">
                      {[row.product.brand, row.product.category].filter(Boolean).join(" · ")}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ flexShrink: 0 }}>
                    {isSearching && (
                      <span style={{ fontSize: 10, color: "#c8a75a", display: "flex", alignItems: "center", gap: 5 }}>
                        <span className="ap-spin" style={{ width: 10, height: 10, border: "1.5px solid rgba(200,167,90,0.2)", borderTopColor: "#c8a75a", borderRadius: "50%" }} />
                        Searching…
                      </span>
                    )}
                    {isFound && !isSaved && <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 700 }}>✓ Found</span>}
                    {isSaved && <span style={{ fontSize: 10, color: "#c8a75a", fontWeight: 700 }}>✓ Saved</span>}
                    {isError && (
                      <button onClick={() => retryRow(row.product.id)} className="ap-btn ap-btn-danger ap-btn-sm">
                        ↺ Retry
                      </button>
                    )}
                    {isNotFound && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Not found</span>
                    )}
                  </div>
                </div>

                {/* Searching animation */}
                {isSearching && (
                  <div style={{ padding: "0 16px 12px" }}>
                    <div className="ap-scanning">
                      <div className="ap-scanning-text">
                        <span className="ap-spin" style={{ width: 12, height: 12, border: "2px solid rgba(200,167,90,0.2)", borderTopColor: "#c8a75a", borderRadius: "50%" }} />
                        Searching Google India for <strong style={{ color: "#c8a75a" }}>"{row.product.title.substring(0, 40)}{row.product.title.length > 40 ? "…" : ""}"</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result */}
                {isFound && row.result && (
                  <div className="ap-result">
                    <div className="ap-price-inr">
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Found:</span>
                      ₹{row.inrFound?.toLocaleString()}
                    </div>
                    <div className="ap-arrow">→</div>
                    <div>
                      <div className="ap-price-lsl">M {fmt(row.result.final_price_lsl)}</div>
                      <div className="ap-compare">M {fmt(row.result.compare_price_lsl)} compare</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    {row.inrConfidence && confidencePill(row.inrConfidence)}
                    <div className="ap-source">via {row.inrSource}</div>
                  </div>
                )}

                {/* Error message */}
                {isError && (
                  <div style={{ padding: "8px 16px 12px", fontSize: 11, color: "rgba(248,113,113,0.7)" }}>
                    ✗ {row.errorMsg || "Search failed"}
                  </div>
                )}

                {/* Manual override input — shown when found or not found */}
                {(isFound || isNotFound || isError) && !isSaved && (
                  <div className="ap-override-wrap">
                    <span className="ap-override-label">Override ₹</span>
                    <input
                      type="number"
                      value={row.inrFound ?? ""}
                      onChange={e => overrideInr(row.product.id, e.target.value)}
                      placeholder="Enter manually"
                      className="ap-override-input"
                    />
                    {row.inrFound && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                        → M {row.result ? fmt(row.result.final_price_lsl) : "…"}
                      </span>
                    )}
                  </div>
                )}

                {/* Saved overlay */}
                {isSaved && (
                  <div style={{ padding: "8px 16px 12px", fontSize: 11, color: "#c8a75a", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    Saved to store: M {row.result ? fmt(row.result.final_price_lsl) : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── STICKY SAVE BAR ── */}
        {stats.readyToSave > 0 && (
          <div className="ap-save-bar">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c8a75a", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#f0f0f0" }}>
                {stats.readyToSave} prices ready to save
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                Review above, then save to your store
              </div>
            </div>
            <button onClick={saveAll} disabled={bulkSaving} className="ap-btn ap-btn-gold">
              {bulkSaving
                ? <><span className="ap-spin" style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#050e08", borderRadius: "50%" }} /> Saving…</>
                : `💾 Save ${stats.readyToSave} Prices to Store`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}