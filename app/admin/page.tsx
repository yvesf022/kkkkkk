"use client";

// FILE: app/admin/page.tsx  (Admin Dashboard)

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { adminApi, ordersApi, paymentsApi, calculatePrice, exchangeApi, adminTokenStorage, pricingApi } from "@/lib/api";
import { C, StatCard, Card, CardHeader, Badge, Btn, Table, TR, TD, fmtMoney, fmtNum, fmtDateTime, shortId, Skeleton } from "@/components/admin/AdminUI";
import type { ProductListItem } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "";

/* ══════════════════════════════════════════════════════════════
   SESSION BRIDGE
   Writes found INR prices into pricing-page.tsx's session key
   so opening the Pricing Manager shows everything pre-filled.
══════════════════════════════════════════════════════════════ */
const SESSION_KEY = "karabo_pricing_session_v1";

function writePricingSession(inputs: Record<string, string>) {
  try {
    const existing = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "{}");
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...existing,
      inputs: { ...(existing.inputs ?? {}), ...inputs },
      savedAt: Date.now(),
    }));
  } catch {}
}

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */
type Stats = {
  total_products: number;
  active_products: number;
  total_orders: number;
  paid_orders: number;
  pending_payments: number;
  low_stock_products: number;
  total_revenue: number;
  revenue_this_month: number;
};

type JobStatus = "idle" | "searching" | "found" | "not_found" | "error" | "saved";

type JobRow = {
  product: ProductListItem;
  status: JobStatus;
  inr: number | null;
  inrSource: string;
  lsl: number | null;
  compareLsl: number | null;
  errorMsg?: string;
};

type RunState = "idle" | "running" | "paused" | "done";

/* ══════════════════════════════════════════════════════════════
   AI PRICE SEARCH  — calls Claude with web_search
══════════════════════════════════════════════════════════════ */
async function findPriceINR(title: string, brand?: string | null, category?: string | null) {
  const query = [brand, title, category].filter(Boolean).join(" ");
  const prompt = `Find the current retail price in Indian Rupees (₹) for: "${query}"

Search Amazon.in, Flipkart.com, or Nykaa.com. Return ONLY this JSON, nothing else:
{"inr_price": <number or null>, "source": "<site name>", "confidence": "high|medium|low"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error("No price found");
  const parsed = JSON.parse(match[0]);
  if (!parsed.inr_price) throw new Error("Price not found on Indian sites");
  return { inr: parseFloat(parsed.inr_price), source: parsed.source ?? "Unknown" };
}

/* ══════════════════════════════════════════════════════════════
   AUTO-PRICER WIDGET
══════════════════════════════════════════════════════════════ */
function AutoPricerWidget({ rate, rateLoading }: { rate: number; rateLoading: boolean }) {
  const [runState, setRunState]       = useState<RunState>("idle");
  const [jobs, setJobs]               = useState<JobRow[]>([]);
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [loadingProds, setLoadingProds] = useState(false);
  const [bulkSaving, setBulkSaving]   = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [sessionWritten, setSessionWritten] = useState(false);

  const pauseRef  = useRef(false);
  const cancelRef = useRef(false);
  const toastRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef    = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, ok = true) => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, ok });
    toastRef.current = setTimeout(() => setToast(null), 4000);
  };

  /* stats */
  const stats = {
    total:    jobs.length,
    found:    jobs.filter(j => j.status === "found" || j.status === "saved").length,
    notFound: jobs.filter(j => j.status === "not_found").length,
    errors:   jobs.filter(j => j.status === "error").length,
    saved:    jobs.filter(j => j.status === "saved").length,
    ready:    jobs.filter(j => j.lsl !== null && j.status === "found").length,
    progress: jobs.length > 0
      ? Math.round((jobs.filter(j => j.status !== "idle" && j.status !== "searching").length / jobs.length) * 100)
      : 0,
  };

  /* load products */
  const loadAndRun = useCallback(async () => {
    setLoadingProds(true);
    cancelRef.current = false;
    pauseRef.current = false;
    setSessionWritten(false);
    try {
      const res = await fetch(`${BACKEND}/api/products/admin/pricing/all`, {
        headers: { Authorization: `Bearer ${adminTokenStorage.get() ?? ""}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const products: ProductListItem[] = (data.results ?? []).filter((p: any) => !p.is_priced);
      if (!products.length) { showToast("All products are already priced! 🎉"); return; }

      const rows: JobRow[] = products.map(p => ({
        product: p, status: "idle", inr: null, inrSource: "", lsl: null, compareLsl: null,
      }));
      setJobs(rows);
      setCurrentIdx(0);
      setRunState("running");
      setLoadingProds(false);

      // Run search loop
      for (let i = 0; i < rows.length; i++) {
        if (cancelRef.current) break;
        while (pauseRef.current) {
          await new Promise(r => setTimeout(r, 300));
          if (cancelRef.current) break;
        }
        if (cancelRef.current) break;

        const id = rows[i].product.id;
        setCurrentIdx(i);

        setJobs(prev => prev.map(j => j.product.id === id ? { ...j, status: "searching" } : j));

        // Scroll log to bottom
        setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);

        try {
          const { inr, source } = await findPriceINR(rows[i].product.title, rows[i].product.brand, rows[i].product.category);
          const result = calculatePrice({ market_price_inr: inr, exchange_rate: rate });
          setJobs(prev => prev.map(j => j.product.id === id ? {
            ...j, status: "found", inr, inrSource: source,
            lsl: result.final_price_lsl, compareLsl: result.compare_price_lsl,
          } : j));

          // Write to pricing session incrementally
          writePricingSession({ [id]: String(inr) });

        } catch (e: any) {
          setJobs(prev => prev.map(j => j.product.id === id ? {
            ...j, status: e?.message?.includes("not found") ? "not_found" : "error",
            errorMsg: e?.message,
          } : j));
        }

        if (i < rows.length - 1) await new Promise(r => setTimeout(r, 1400));
      }

      if (!cancelRef.current) {
        setRunState("done");
        setSessionWritten(true);
        showToast(`Found prices for ${jobs.filter(j => j.status === "found").length} products — ready to save!`);
      } else {
        setRunState("idle");
      }
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load products", false);
      setRunState("idle");
    } finally {
      setLoadingProds(false);
    }
  }, [rate]);

  /* bulk save direct to DB */
  const saveAll = async () => {
    const toSave = jobs.filter(j => j.lsl !== null && j.compareLsl !== null && j.status === "found");
    if (!toSave.length) { showToast("Nothing ready to save", false); return; }
    setBulkSaving(true);
    setJobs(prev => prev.map(j => j.status === "found" ? { ...j, status: "saved" as JobStatus } : j));
    try {
      const items = toSave.map(j => ({
        product_id: j.product.id,
        price_lsl: j.lsl!,
        compare_price_lsl: j.compareLsl!,
      }));
      const res = await pricingApi.bulkApply(items);

      // Mark priced in DB
      fetch(`${BACKEND}/api/products/admin/pricing/bulk-mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminTokenStorage.get() ?? ""}` },
        body: JSON.stringify({ product_ids: toSave.map(j => j.product.id), is_priced: true }),
      }).catch(() => {});

      showToast(`✓ ${res.success ?? toSave.length} prices saved to your store!`);
    } catch (e: any) {
      showToast(e?.message ?? "Save failed", false);
      setJobs(prev => prev.map(j => j.status === "saved" ? { ...j, status: "found" as JobStatus } : j));
    } finally {
      setBulkSaving(false);
    }
  };

  const isRunning = runState === "running";
  const isDone    = runState === "done";
  const hasJobs   = jobs.length > 0;

  return (
    <>
      <style>{`
        @keyframes ap-spin    { to { transform: rotate(360deg); } }
        @keyframes ap-fadeUp  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ap-scan    { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes ap-pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes ap-blink   { 0%,100%{opacity:1} 50%{opacity:0} }

        .ap-card { animation: ap-fadeUp 0.25s ease both; }
        .ap-spin-icon { animation: ap-spin 0.9s linear infinite; display: inline-block; }

        .ap-log {
          height: 260px;
          overflow-y: auto;
          background: #050e08;
          border-radius: 10px;
          padding: 12px;
          font-family: 'DM Mono', 'Courier New', monospace;
          font-size: 11.5px;
          scroll-behavior: smooth;
        }
        .ap-log::-webkit-scrollbar { width: 4px; }
        .ap-log::-webkit-scrollbar-track { background: transparent; }
        .ap-log::-webkit-scrollbar-thumb { background: rgba(200,167,90,0.3); border-radius: 2px; }

        .ap-log-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 5px 6px;
          border-radius: 6px;
          margin-bottom: 2px;
          line-height: 1.4;
          animation: ap-fadeUp 0.2s ease;
        }
        .ap-log-row:hover { background: rgba(255,255,255,0.03); }

        .ap-log-idx   { color: rgba(255,255,255,0.2); font-size: 10px; flex-shrink: 0; padding-top: 1px; min-width: 28px; }
        .ap-log-title { color: rgba(255,255,255,0.75); flex: 1; min-width: 0; word-break: break-word; }
        .ap-log-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; white-space: nowrap; }

        .ap-progress-track { height: 5px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .ap-progress-fill  { height: 100%; border-radius: 10px; background: linear-gradient(90deg,#0f3f2f,#c8a75a); transition: width 0.5s ease; }

        .ap-stat-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
        .ap-stat-box {
          flex: 1; min-width: 64px;
          background: #f8fafc; border: 1px solid #e5e7eb;
          border-radius: 10px; padding: 9px 10px; text-align: center;
        }
        .ap-stat-val { font-size: 20px; font-weight: 900; line-height: 1; }
        .ap-stat-lbl { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 3px; }

        .ap-btn-start {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 28px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 15px; font-weight: 800; font-family: inherit; letter-spacing: -0.2px;
          background: linear-gradient(135deg, #0f3f2f, #1b5e4a);
          color: white; box-shadow: 0 4px 20px rgba(15,63,47,0.3);
          transition: all 0.2s;
        }
        .ap-btn-start:hover:not(:disabled) { box-shadow: 0 8px 28px rgba(15,63,47,0.4); transform: translateY(-1px); }
        .ap-btn-start:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ap-btn-save {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 28px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 15px; font-weight: 800; font-family: inherit;
          background: linear-gradient(135deg, #c8a75a, #b8973e);
          color: #050e08; box-shadow: 0 4px 20px rgba(200,167,90,0.3);
          transition: all 0.2s;
        }
        .ap-btn-save:hover:not(:disabled) { box-shadow: 0 8px 28px rgba(200,167,90,0.5); transform: translateY(-1px); }
        .ap-btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ap-btn-sm {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 7px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 700; font-family: inherit;
          transition: all 0.15s;
        }

        .ap-cursor { animation: ap-blink 1s infinite; }
      `}</style>

      <Card style={{ marginBottom: 20, borderLeft: `4px solid #c8a75a`, overflow: "hidden", position: "relative" }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "absolute", top: 12, right: 12, zIndex: 50,
            background: toast.ok ? "#0f3f2f" : "#7f1d1d",
            color: toast.ok ? "#4ade80" : "#fca5a5",
            padding: "9px 16px", borderRadius: 8,
            fontSize: 12, fontWeight: 700,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            animation: "ap-fadeUp 0.3s ease",
            border: `1px solid ${toast.ok ? "rgba(74,222,128,0.3)" : "rgba(220,38,38,0.3)"}`,
          }}>
            {toast.ok ? "✓" : "✗"} {toast.msg}
          </div>
        )}

        {/* Header */}
        <CardHeader
          title="🤖 AI Auto-Pricer"
          action={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isRunning && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  background: "rgba(15,63,47,0.1)", color: "#0f3f2f",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0, animation: "ap-pulse 1.2s infinite" }} />
                  LIVE — {currentIdx + 1} / {jobs.length}
                </span>
              )}
              <Link href="/admin/pricing" style={{ fontSize: 12, color: C.accent, textDecoration: "none", fontWeight: 600 }}>
                Full Pricing Manager →
              </Link>
            </div>
          }
        />

        <div style={{ padding: "0 20px 20px" }}>

          {/* ── IDLE STATE — big start button ── */}
          {runState === "idle" && !hasJobs && (
            <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
                Click <strong>Start Pricing</strong> to automatically search Google India for every unpriced product in your store, convert to Maloti, and prepare them all for review.
              </div>
              <button
                onClick={loadAndRun}
                disabled={loadingProds || rateLoading}
                className="ap-btn-start"
              >
                {loadingProds ? (
                  <><span className="ap-spin-icon" style={{ width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} /> Loading products…</>
                ) : (
                  <>🤖 Start Pricing All Products</>
                )}
              </button>
              <div style={{ marginTop: 12, fontSize: 11, color: C.faint }}>
                Searches Amazon.in · Flipkart · Nykaa for each product · Converts ₹ → M automatically
              </div>
            </div>
          )}

          {/* ── RUNNING / DONE ── */}
          {hasJobs && (
            <>
              {/* Progress */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4, marginTop: 4 }}>
                <span>Pricing progress</span>
                <span style={{ fontWeight: 700, color: isDone ? "#0f3f2f" : "#c8a75a" }}>
                  {stats.progress}% — {stats.found} found / {stats.total} total
                </span>
              </div>
              <div className="ap-progress-track">
                <div className="ap-progress-fill" style={{ width: `${stats.progress}%` }} />
              </div>

              {/* Stats row */}
              <div className="ap-stat-row">
                <div className="ap-stat-box">
                  <div className="ap-stat-val" style={{ color: C.text }}>{stats.total}</div>
                  <div className="ap-stat-lbl">Total</div>
                </div>
                <div className="ap-stat-box">
                  <div className="ap-stat-val" style={{ color: "#0f3f2f" }}>{stats.found}</div>
                  <div className="ap-stat-lbl">Found</div>
                </div>
                <div className="ap-stat-box">
                  <div className="ap-stat-val" style={{ color: "#d97706" }}>{stats.notFound}</div>
                  <div className="ap-stat-lbl">Not Found</div>
                </div>
                <div className="ap-stat-box">
                  <div className="ap-stat-val" style={{ color: "#dc2626" }}>{stats.errors}</div>
                  <div className="ap-stat-lbl">Errors</div>
                </div>
                {stats.saved > 0 && (
                  <div className="ap-stat-box">
                    <div className="ap-stat-val" style={{ color: "#c8a75a" }}>{stats.saved}</div>
                    <div className="ap-stat-lbl">Saved</div>
                  </div>
                )}
              </div>

              {/* Live log */}
              <div ref={logRef} className="ap-log">
                {jobs.map((j, i) => {
                  const isActive = j.status === "searching";
                  return (
                    <div key={j.product.id} className="ap-log-row" style={{ background: isActive ? "rgba(200,167,90,0.06)" : undefined }}>
                      <span className="ap-log-idx">{String(i + 1).padStart(2, "0")}</span>

                      {/* Status icon */}
                      <span style={{ flexShrink: 0, paddingTop: 1 }}>
                        {j.status === "idle"      && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>○</span>}
                        {j.status === "searching" && <span className="ap-spin-icon" style={{ width: 11, height: 11, border: "1.5px solid rgba(200,167,90,0.25)", borderTopColor: "#c8a75a", borderRadius: "50%", display: "inline-block" }} />}
                        {j.status === "found"     && <span style={{ color: "#4ade80", fontSize: 12 }}>✓</span>}
                        {j.status === "saved"     && <span style={{ color: "#c8a75a", fontSize: 12 }}>✓</span>}
                        {j.status === "not_found" && <span style={{ color: "#d97706", fontSize: 12 }}>?</span>}
                        {j.status === "error"     && <span style={{ color: "#f87171", fontSize: 12 }}>✗</span>}
                      </span>

                      <span className="ap-log-title" style={{ color: isActive ? "#f0f0f0" : undefined }}>
                        {j.product.title.length > 52 ? j.product.title.slice(0, 52) + "…" : j.product.title}
                        {isActive && <span className="ap-cursor" style={{ marginLeft: 3, color: "#c8a75a" }}>|</span>}
                      </span>

                      {/* Result badge */}
                      {j.status === "found" && j.inr && j.lsl && (
                        <span className="ap-log-badge" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
                          ₹{j.inr.toLocaleString()} → M{j.lsl.toFixed(2)}
                        </span>
                      )}
                      {j.status === "saved" && j.lsl && (
                        <span className="ap-log-badge" style={{ background: "rgba(200,167,90,0.15)", color: "#c8a75a" }}>
                          M{j.lsl.toFixed(2)} saved
                        </span>
                      )}
                      {j.status === "searching" && (
                        <span className="ap-log-badge" style={{ background: "rgba(200,167,90,0.08)", color: "rgba(200,167,90,0.7)" }}>
                          searching…
                        </span>
                      )}
                      {j.status === "not_found" && (
                        <span className="ap-log-badge" style={{ background: "rgba(217,119,6,0.1)", color: "#d97706" }}>not found</span>
                      )}
                      {j.status === "error" && (
                        <span className="ap-log-badge" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>error</span>
                      )}
                      {j.inrSource && j.status === "found" && (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{j.inrSource}</span>
                      )}
                    </div>
                  );
                })}

                {/* Blinking cursor while running */}
                {isRunning && (
                  <div style={{ padding: "6px 6px", color: "rgba(200,167,90,0.5)", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="ap-cursor">█</span>
                    <span>Searching Google India…</span>
                  </div>
                )}
                {isDone && (
                  <div style={{ padding: "8px 6px", color: "#4ade80", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    ✓ All done — {stats.found} prices found
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

                {/* Pause/Resume while running */}
                {runState === "running" && (
                  <button className="ap-btn-sm" onClick={() => { pauseRef.current = true; setRunState("paused"); }}
                    style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                    ⏸ Pause
                  </button>
                )}
                {runState === "paused" && (
                  <button className="ap-btn-sm" onClick={() => { pauseRef.current = false; setRunState("running"); }}
                    style={{ background: "#dcfce7", color: "#14532d", border: "1px solid #bbf7d0" }}>
                    ▶ Resume
                  </button>
                )}
                {(runState === "running" || runState === "paused") && (
                  <button className="ap-btn-sm" onClick={() => { cancelRef.current = true; setRunState("idle"); }}
                    style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}>
                    ✕ Stop
                  </button>
                )}

                {/* Save all */}
                {(isDone || runState === "paused") && stats.ready > 0 && (
                  <button onClick={saveAll} disabled={bulkSaving} className="ap-btn-save" style={{ padding: "10px 22px", fontSize: 13 }}>
                    {bulkSaving
                      ? <><span className="ap-spin-icon" style={{ width: 13, height: 13, border: "2px solid rgba(0,0,0,0.15)", borderTopColor: "#050e08", borderRadius: "50%" }} /> Saving…</>
                      : `💾 Save ${stats.ready} Prices to Store`}
                  </button>
                )}

                {/* Open in Pricing Manager */}
                {sessionWritten && (
                  <Link href="/admin/pricing" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 18px", borderRadius: 8,
                    background: "#7c3aed", color: "white",
                    fontSize: 13, fontWeight: 700, textDecoration: "none",
                  }}>
                    📋 Review in Pricing Manager
                  </Link>
                )}

                {/* Restart */}
                {(isDone || runState === "idle") && hasJobs && (
                  <button className="ap-btn-sm" onClick={() => { setJobs([]); setRunState("idle"); setSessionWritten(false); }}
                    style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, marginLeft: "auto" }}>
                    ↺ Start Over
                  </button>
                )}
              </div>

              {/* Session bridge info */}
              {sessionWritten && (
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 8,
                  background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
                  fontSize: 12, color: "#7c3aed", display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  All found prices have been loaded into the Pricing Manager — open it to review, adjust, and save.
                </div>
              )}
            </>
          )}

          {/* Rate display */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.faint }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: rateLoading ? "#94a3b8" : "#22c55e", flexShrink: 0 }} />
            {rateLoading ? "Fetching exchange rate…" : `Exchange rate: ₹1 = M ${rate.toFixed(4)}`}
          </div>
        </div>
      </Card>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [orders,   setOrders]   = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [refresh,  setRefresh]  = useState(0);
  const [rate,     setRate]     = useState(0.21);
  const [rateLoading, setRateLoading] = useState(true);

  useEffect(() => {
    exchangeApi.getINRtoLSL()
      .then(({ rate: r }) => setRate(r))
      .finally(() => setRateLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      adminApi.getDashboard(),
      ordersApi.getAdmin(),
      paymentsApi.adminList("pending"),
      adminApi.getLowStock(),
    ]).then(([d, o, p, ls]) => {
      if (d.status  === "fulfilled") setStats(d.value as Stats);
      else setError("Dashboard data unavailable");
      if (o.status  === "fulfilled") setOrders((o.value as any[]).slice(0, 8));
      if (p.status  === "fulfilled") setPayments((p.value as any[]).slice(0, 8));
      if (ls.status === "fulfilled") setLowStock((ls.value as any[]).slice(0, 8));
    }).finally(() => setLoading(false));
  }, [refresh]);

  if (loading) return <DashSkeleton />;
  if (error && !stats) return (
    <div style={{ padding: 40, color: C.danger, textAlign: "center" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
      <div>{error}</div>
      <Btn style={{ marginTop: 16 }} onClick={() => setRefresh(r => r + 1)}>Retry</Btn>
    </div>
  );

  const s = stats ?? {} as Stats;

  return (
    <div style={{ maxWidth: 1400 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: -0.5 }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Btn onClick={() => setRefresh(r => r + 1)} variant="ghost" small>↺ Refresh</Btn>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Revenue"    value={fmtMoney(s.total_revenue)}     icon="◈" color={C.navy} />
        <StatCard label="This Month"       value={fmtMoney(s.revenue_this_month)} icon="↗" color={C.green} />
        <StatCard label="Total Orders"     value={fmtNum(s.total_orders)}         icon="◎" />
        <StatCard label="Paid Orders"      value={fmtNum(s.paid_orders)}          icon="✓" color={C.success} />
        <StatCard label="Pending Payments" value={fmtNum(s.pending_payments)}     icon="◇" alert={s.pending_payments > 0} />
        <StatCard label="Active Products"  value={fmtNum(s.active_products)}      icon="◈" color={C.green} />
        <StatCard label="Low Stock"        value={fmtNum(s.low_stock_products)}   icon="▦" alert={s.low_stock_products > 0} />
        <StatCard label="Total Products"   value={fmtNum(s.total_products)}       icon="▣" />
      </div>

      {/* Quick Actions */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Quick Actions" />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "+ Add Product",       href: "/admin/products/new",           bg: C.navy,    fg: "#fff" },
            { label: "Bulk Upload CSV",     href: "/admin/products/bulk-upload",   bg: C.green,   fg: "#fff" },
            { label: "💰 Pricing Manager",  href: "/admin/pricing",                bg: "#7c3aed", fg: "#fff" },
            { label: "Review Payments",     href: "/admin/payments",               bg: "#dc2626", fg: "#fff", badge: s.pending_payments },
            { label: "Manage Orders",       href: "/admin/orders",                 bg: C.surface, fg: C.text },
            { label: "Inventory",           href: "/admin/inventory",              bg: C.surface, fg: C.text, badge: s.low_stock_products },
            { label: "Analytics",           href: "/admin/analytics",              bg: C.surface, fg: C.text },
            { label: "Customers",           href: "/admin/users",                  bg: C.surface, fg: C.text },
            { label: "Stores",              href: "/admin/stores",                 bg: C.surface, fg: C.text },
            { label: "Audit Logs",          href: "/admin/logs",                   bg: C.surface, fg: C.text },
            { label: "Bank Settings",       href: "/admin/settings/bank",          bg: C.surface, fg: C.text },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7,
              background: a.bg, color: a.fg,
              border: a.bg === C.surface ? `1px solid ${C.border}` : "none",
              position: "relative",
            }}>
              {a.label}
              {(a as any).badge > 0 && (
                <span style={{
                  background: a.bg === C.surface ? C.danger : "rgba(255,255,255,0.3)",
                  color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px",
                }}>
                  {(a as any).badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      {/* ── AUTO-PRICER WIDGET (replaces old PricingWidget) ── */}
      <AutoPricerWidget rate={rate} rateLoading={rateLoading} />

      {/* Three-col live tables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>

        {/* Recent Orders */}
        <Card>
          <CardHeader title="Recent Orders" action={<Link href="/admin/orders" style={viewAll}>View all →</Link>} />
          {orders.length === 0 ? <Empty msg="No orders yet." /> : (
            <Table headers={["Order", "Amount", "Status", "Date"]}>
              {orders.map(o => (
                <TR key={o.id}>
                  <TD><Link href={`/admin/orders/${o.id}`} style={linkStyle}>{shortId(o.id)}</Link></TD>
                  <TD>{fmtMoney(o.total_amount)}</TD>
                  <TD><Badge status={o.status} /></TD>
                  <TD muted>{fmtDateTime(o.created_at)}</TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader title="Pending Payments" action={<Link href="/admin/payments" style={viewAll}>View all →</Link>} />
          {payments.length === 0 ? <Empty msg="No pending payments." /> : (
            <Table headers={["ID", "Order", "Amount", "Action"]}>
              {payments.map(p => (
                <TR key={p.id}>
                  <TD mono>{shortId(p.id)}</TD>
                  <TD muted>{shortId(p.order_id)}</TD>
                  <TD><strong>{fmtMoney(p.amount)}</strong></TD>
                  <TD>
                    <Link href="/admin/payments" style={{ color: C.danger, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      Review →
                    </Link>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader title="Low Stock Alerts" action={<Link href="/admin/inventory" style={viewAll}>View all →</Link>} />
          {lowStock.length === 0
            ? <div style={{ textAlign: "center", padding: "32px 0", color: C.success, fontSize: 13 }}>✓ All products well stocked</div>
            : (
            <Table headers={["Product", "Stock", ""]}>
              {lowStock.map(p => (
                <TR key={p.id}>
                  <TD>
                    <div style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                      {p.title}
                    </div>
                  </TD>
                  <TD>
                    <span style={{ color: p.stock === 0 ? C.danger : C.warn, fontWeight: 800 }}>
                      {p.stock} {p.stock === 0 ? "OUT" : "left"}
                    </span>
                  </TD>
                  <TD>
                    <Link href={`/admin/products/${p.id}`} style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      Restock →
                    </Link>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function DashSkeleton() {
  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 100, borderRadius: 14, background: "#e2e8f0", animation: "shimmer 1.4s infinite" }} />
        ))}
      </div>
      <Skeleton rows={6} />
      <style>{`@keyframes shimmer{from{opacity:.6}to{opacity:1}}`}</style>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ textAlign: "center", padding: "32px 0", color: C.faint, fontSize: 13 }}>{msg}</div>;
}

const viewAll: React.CSSProperties = { fontSize: 12, color: C.accent, textDecoration: "none", fontWeight: 600 };
const linkStyle: React.CSSProperties = { color: C.accent, textDecoration: "none", fontWeight: 600, fontFamily: "monospace", fontSize: 12 };