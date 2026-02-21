"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { paymentsApi, ordersApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import type { Payment } from "@/lib/types";

const FF = "'Sora', 'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#2563EB";

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending:  { label: "Awaiting Payment",  color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
  on_hold:  { label: "Under Review",      color: "#7C3D0A", bg: "#FFF7ED", border: "#FED7AA", dot: "#F97316" },
  paid:     { label: "Confirmed",          color: "#065F46", bg: "#F0FDF4", border: "#BBF7D0", dot: "#10B981" },
  rejected: { label: "Rejected",           color: "#991B1B", bg: "#FFF1F2", border: "#FECDD3", dot: "#F43F5E" },
};

function Thumb({ src, alt, size = 44 }: { src?: string|null; alt: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width: size, height: size, borderRadius: 8, background: "linear-gradient(135deg,#F1F5F9,#E2E8F0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, flexShrink: 0 }}>📦</div>
  );
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid #F1F5F9" }} />;
}

function Spinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "kspin .7s linear infinite" }}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".12"/>
      <path d="M10 2a8 8 0 018 8" stroke={ACCENT} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function AccountPaymentsPage() {
  const [payments,    setPayments]    = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<any|null>(null);
  const [history,     setHistory]     = useState<any[]>([]);
  const [orderItems,  setOrderItems]  = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionBusy,  setActionBusy]  = useState(false);
  const [toast,       setToast]       = useState<{msg:string;type:"ok"|"err"}|null>(null);
  const [proofFile,   setProofFile]   = useState<File|null>(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [showCancel,  setShowCancel]  = useState(false);
  const [cancelReason,setCancelReason]= useState("");
  const [showDelete,  setShowDelete]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string, type: "ok"|"err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const [rawPmts, bank] = await Promise.allSettled([paymentsApi.getMy(), paymentsApi.getBankDetails()]);
      if (rawPmts.status === "fulfilled") {
        const v: any = rawPmts.value;
        setPayments(Array.isArray(v) ? v : v?.payments ?? v?.results ?? []);
      }
      if (bank.status === "fulfilled") setBankDetails(bank.value);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function selectPayment(p: any) {
    setSelected(p); setShowUpload(false); setShowCancel(false); setShowDelete(false); setProofFile(null);
    setOrderItems([]); setHistory([]);
    setLoadingDetail(true);
    try {
      const [hist, order] = await Promise.allSettled([
        paymentsApi.getStatusHistory(p.id),
        p.order_id ? ordersApi.getById(p.order_id) : Promise.resolve(null),
      ]);
      if (hist.status === "fulfilled") {
        const hv: any = hist.value;
        setHistory(Array.isArray(hv) ? hv : hv?.history ?? hv?.results ?? []);
      }
      if (order.status === "fulfilled" && order.value) {
        setOrderItems((order.value as any)?.items ?? []);
      }
    } catch {} finally { setLoadingDetail(false); }
  }

  async function act(fn: () => Promise<any>, msg: string) {
    setActionBusy(true);
    try {
      await fn();
      flash(msg);
      await load();
      // refresh selected
      const fresh: any[] = await paymentsApi.getMy().then((v: any) =>
        Array.isArray(v) ? v : v?.payments ?? v?.results ?? []
      ).catch(() => []);
      const next = fresh.find(p => p.id === selected?.id);
      if (next) await selectPayment(next); else setSelected(null);
    } catch (e: any) { flash(e?.message ?? "Action failed", "err"); }
    finally { setActionBusy(false); }
  }

  async function handleUploadProof() {
    if (!proofFile || !selected) return;
    await act(async () => {
      if (selected.status === "on_hold" || selected.status === "rejected") {
        await paymentsApi.resubmitProof(selected.id, proofFile);
      } else {
        await paymentsApi.uploadProof(selected.id, proofFile);
      }
      setProofFile(null); setShowUpload(false);
    }, "Proof uploaded!");
  }

  async function handleCancelPayment() {
    if (!cancelReason.trim()) { flash("Please enter a reason", "err"); return; }
    await act(() => paymentsApi.cancel(selected.id, cancelReason), "Payment cancelled");
    setCancelReason(""); setShowCancel(false);
  }

  async function handleDeletePayment() {
    await act(() => paymentsApi.cancel(selected.id, "User requested deletion"), "Payment cancelled and removed");
    setShowDelete(false); setSelected(null);
  }

  const s = selected ? STATUS[selected.status] ?? STATUS.pending : null;
  const canUpload = selected && ["pending", "on_hold", "rejected"].includes(selected.status);
  const canCancel = selected && ["pending", "on_hold"].includes(selected.status);
  const canDelete = selected && selected.status === "pending";
  const canRetry  = selected && selected.status === "rejected";

  return (
    <div style={{ fontFamily: FF, maxWidth: 920, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes kspin { to { transform: rotate(360deg); } }
        @keyframes kfadeup { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .kpmt-row { transition: background .15s, box-shadow .15s; cursor: pointer; border-radius: 14px; }
        .kpmt-row:hover { background: #F8FAFC !important; }
        .kpmt-row.selected { background: #EFF6FF !important; box-shadow: inset 0 0 0 2px ${ACCENT}; }
        .kcard { background:#fff; border:1px solid #E2E8F0; border-radius:16px; padding:22px; }
        .kbtn-ghost { background:transparent; border:1px solid #E2E8F0; color:#475569; padding:9px 16px; border-radius:10px; font-weight:600; font-size:13px; font-family:${FF}; cursor:pointer; }
        .kbtn-ghost:hover { background:#F8FAFC; }
        .kbtn-primary { background:${ACCENT}; color:#fff; border:none; padding:10px 18px; border-radius:10px; font-weight:700; font-size:14px; font-family:${FF}; cursor:pointer; }
        .kbtn-danger { background:#DC2626; color:#fff; border:none; padding:10px 18px; border-radius:10px; font-weight:700; font-size:14px; font-family:${FF}; cursor:pointer; }
        .kbtn-full { width:100%; display:flex; align-items:center; justify-content:center; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Account</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: BRAND, letterSpacing: "-0.04em", margin: 0 }}>My Payments</h1>
        {!loading && <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>{payments.length} payment record{payments.length !== 1 ? "s" : ""}</p>}
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", color: "#94A3B8" }}>
          <Spinner /><p style={{ fontSize: 14 }}>Loading payments…</p>
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💳</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: BRAND, margin: "0 0 8px" }}>No payments yet</h3>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>Your payment history will appear here after placing orders.</p>
          <Link href="/store" style={{ padding: "12px 28px", borderRadius: 10, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Browse Store →</Link>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 16, alignItems: "start" }}>

          {/* ── Payments list ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {payments.map((p, i) => {
              const st = STATUS[p.status] ?? STATUS.pending;
              const isSelected = selected?.id === p.id;
              return (
                <div key={p.id} onClick={() => isSelected ? setSelected(null) : selectPayment(p)}
                  className={`kpmt-row${isSelected ? " selected" : ""}`}
                  style={{ background: "#fff", border: `1px solid ${isSelected ? ACCENT : "#E2E8F0"}`, padding: "16px 18px", animation: `kfadeup .25s ease ${i*0.04}s both` }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <code style={{ fontSize: 12, fontWeight: 700, color: BRAND, background: "#F1F5F9", padding: "2px 8px", borderRadius: 6 }}>#{p.id.slice(0,8).toUpperCase()}</code>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, textTransform: "capitalize" }}>via {p.method?.replace(/_/g, " ")}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: BRAND }}>{formatCurrency(p.amount)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: st.bg, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 700, color: st.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }}/>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Proof indicator */}
                  {p.proof?.file_url && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#10B981", fontWeight: 600, background: "#F0FDF4", padding: "3px 8px", borderRadius: 6 }}>
                      📎 Proof uploaded
                    </div>
                  )}

                  {p.order_id && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#94A3B8" }}>
                      Order: <code style={{ color: BRAND, fontWeight: 600 }}>#{p.order_id.slice(0,8).toUpperCase()}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Detail panel ── */}
          {selected && s && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "kfadeup .25s ease" }}>

              <div className="kcard">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: BRAND, margin: 0 }}>Payment Detail</h3>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 18, lineHeight: 1 }}>✕</button>
                </div>

                {/* Status badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, marginBottom: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0 }}/>
                  <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.label}</span>
                </div>

                {/* Key info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {[
                    ["Payment ID",  `#${selected.id.slice(0,8).toUpperCase()}`],
                    ["Amount",      formatCurrency(selected.amount)],
                    ["Method",      selected.method?.replace(/_/g," ")],
                    ["Date",        new Date(selected.created_at).toLocaleString()],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: 13, color: BRAND, fontWeight: 600, textTransform: "capitalize" }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Proof link */}
                {selected.proof?.file_url && (
                  <a href={selected.proof.file_url} target="_blank" rel="noreferrer"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, textDecoration: "none", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>📎 Proof of payment</span>
                    <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>View →</span>
                  </a>
                )}

                {/* Admin note */}
                {selected.admin_notes && (
                  <div style={{ padding: "10px 12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, fontSize: 13, color: "#991B1B", marginBottom: 12 }}>
                    <strong>Admin note:</strong> {selected.admin_notes}
                  </div>
                )}

                {/* Order items with images */}
                {loadingDetail && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><Spinner /></div>
                )}
                {!loadingDetail && orderItems.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Order Items</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {orderItems.map((item: any, i: number) => {
                        const imgSrc = item.product?.main_image ?? (item.product?.images as any)?.[0]?.image_url ?? null;
                        return (
                          <div key={item.id ?? i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <Thumb src={imgSrc} alt={item.title} size={40} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: BRAND, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                              <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>Qty: {item.quantity}</p>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: BRAND, flexShrink: 0 }}>{formatCurrency(item.subtotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status history timeline */}
                {history.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>History</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {history.map((h: any, i: number) => (
                        <div key={i} style={{ display: "flex", gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? ACCENT : "#CBD5E1", marginTop: 4, flexShrink: 0 }}/>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: BRAND, textTransform: "capitalize" }}>{h.status?.replace(/_/g," ")}</span>
                            {h.reason && <span style={{ fontSize: 12, color: "#64748B" }}> — {h.reason}</span>}
                            <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0" }}>{h.created_at ? new Date(h.created_at).toLocaleString() : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selected.order_id && (
                    <Link href={`/account/orders/${selected.order_id}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderRadius: 10, border: "1px solid #E2E8F0", color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
                      📦 View Order
                    </Link>
                  )}

                  {canUpload && !showUpload && (
                    <button onClick={() => setShowUpload(true)} className="kbtn-primary kbtn-full">
                      📎 {selected.status === "pending" ? "Upload Proof" : "Resubmit Proof"}
                    </button>
                  )}
                  {canUpload && showUpload && (
                    <div style={{ padding: 14, background: "#EFF6FF", borderRadius: 12, border: "1px solid #BFDBFE" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", margin: "0 0 10px" }}>Upload Proof of Payment</p>
                      <div
                        style={{ border: `2px dashed ${dragOver ? ACCENT : "#BFDBFE"}`, borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer", background: dragOver ? "#DBEAFE" : "#F8FAFC", marginBottom: 10, transition: "all .2s" }}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setProofFile(f); }}
                      >
                        {proofFile
                          ? <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: 0 }}>📄 {proofFile.name}</p>
                          : <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>Drop or click to browse<br/><span style={{ fontSize: 11 }}>Image or PDF</span></p>}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleUploadProof} disabled={!proofFile || actionBusy} className="kbtn-primary" style={{ flex: 1, opacity: (!proofFile || actionBusy) ? 0.6 : 1 }}>
                          {actionBusy ? "Uploading…" : "Submit"}
                        </button>
                        <button onClick={() => setShowUpload(false)} className="kbtn-ghost">Cancel</button>
                      </div>
                    </div>
                  )}

                  {canRetry && (
                    <button onClick={() => act(() => paymentsApi.updateMethod(selected.id, selected.method), "Payment method updated. Please upload new proof.")} disabled={actionBusy} className="kbtn-primary kbtn-full" style={{ background: "#166534" }}>
                      ↺ Retry Payment
                    </button>
                  )}

                  {canCancel && !showCancel && (
                    <button onClick={() => setShowCancel(true)} className="kbtn-ghost kbtn-full">Cancel Payment</button>
                  )}
                  {canCancel && showCancel && (
                    <div style={{ padding: 14, background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", margin: "0 0 8px" }}>Cancel this payment?</p>
                      <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason…" rows={2}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECDD3", fontSize: 13, fontFamily: FF, resize: "vertical", color: BRAND, boxSizing: "border-box" }}/>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={handleCancelPayment} disabled={actionBusy} className="kbtn-danger" style={{ flex: 1 }}>
                          {actionBusy ? "Cancelling…" : "Confirm"}
                        </button>
                        <button onClick={() => setShowCancel(false)} className="kbtn-ghost">Keep</button>
                      </div>
                    </div>
                  )}

                  {canDelete && !showDelete && (
                    <button onClick={() => setShowDelete(true)} className="kbtn-ghost kbtn-full" style={{ color: "#DC2626", borderColor: "#FECDD3" }}>🗑 Delete Payment</button>
                  )}
                  {canDelete && showDelete && (
                    <div style={{ padding: 14, background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", margin: "0 0 4px" }}>Delete payment record?</p>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 14px" }}>This cannot be undone. Your order remains intact.</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleDeletePayment} disabled={actionBusy} className="kbtn-danger" style={{ flex: 1 }}>
                          {actionBusy ? "Deleting…" : "Delete"}
                        </button>
                        <button onClick={() => setShowDelete(false)} className="kbtn-ghost">Keep</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank details */}
              {bankDetails && (
                <div className="kcard" style={{ background: "#F8FAFC" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Payment Details</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#475569" }}>
                    {bankDetails.bank_name && <div><strong style={{ color: BRAND }}>{bankDetails.bank_name}</strong></div>}
                    {bankDetails.account_name && <div>Account: <strong style={{ color: BRAND }}>{bankDetails.account_name}</strong></div>}
                    {bankDetails.account_number && <div>Number: <code style={{ color: BRAND, fontWeight: 700 }}>{bankDetails.account_number}</code></div>}
                    {bankDetails.mobile_money_provider && <div>Mobile: <strong style={{ color: BRAND }}>{bankDetails.mobile_money_provider} {bankDetails.mobile_money_number}</strong></div>}
                    {bankDetails.instructions && <p style={{ fontSize: 12, color: "#64748B", marginTop: 8, lineHeight: 1.6 }}>{bankDetails.instructions}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10, background: toast.type === "ok" ? BRAND : "#DC2626", color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.25)", animation: "kfadeup .3s ease" }}>
          {toast.type === "ok" ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
