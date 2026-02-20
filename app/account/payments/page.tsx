"use client";

/**
 * app/account/payments/page.tsx
 *
 * FIXES:
 * #2a — Product images now shown on each payment's order items
 * #2b — Full edit actions: delete payment (if pending), cancel, resubmit proof, retry, view proof
 * #3  — Array normalisation (payments + history) so page never shows endless loading
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { paymentsApi, ordersApi } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

const FF = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0F172A";
const ACCENT = "#2563EB";

const STATUS_META: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  pending:  { bg: "#FFFBEB", fg: "#92400E", dot: "#F59E0B", label: "Pending" },
  on_hold:  { bg: "#FFF7ED", fg: "#7C3D0A", dot: "#F97316", label: "Under Review" },
  paid:     { bg: "#F0FDF4", fg: "#065F46", dot: "#10B981", label: "Paid" },
  rejected: { bg: "#FFF1F2", fg: "#9F1239", dot: "#F43F5E", label: "Rejected" },
};

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return <div style={{ width: 44, height: 44, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📦</div>;
  }
  return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid #F1F5F9" }} />;
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, padding: "12px 20px", borderRadius: 10,
      background: type === "ok" ? BRAND : "#DC2626",
      color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: FF,
      zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.25)", animation: "fadeUp .3s ease",
    }}>
      {type === "ok" ? "✓" : "✗"} {msg}
    </div>
  );
}

export default function AccountPaymentsPage() {
  const router = useRouter();

  const [payments,     setPayments]     = useState<any[]>([]);
  const [bankDetails,  setBankDetails]  = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<any | null>(null);
  const [history,      setHistory]      = useState<any[]>([]);
  const [orderItems,   setOrderItems]   = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [actionBusy,   setActionBusy]   = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [proofFile,    setProofFile]    = useState<File | null>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [showUpload,   setShowUpload]   = useState(false);
  const [showCancel,   setShowCancel]   = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showDelete,   setShowDelete]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const [rawPmts, bank] = await Promise.allSettled([paymentsApi.getMy(), paymentsApi.getBankDetails()]);
      if (rawPmts.status === "fulfilled") {
        const val = rawPmts.value as any;
        setPayments(Array.isArray(val) ? val : val?.payments ?? val?.results ?? []);
      }
      if (bank.status === "fulfilled") setBankDetails(bank.value);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function selectPayment(p: any) {
    setSelected(p);
    setShowUpload(false);
    setShowCancel(false);
    setShowDelete(false);
    setProofFile(null);
    setOrderItems([]);

    // Load status history
    try {
      const h = await paymentsApi.getStatusHistory(p.id);
      const hv = h as any;
      setHistory(Array.isArray(hv) ? hv : hv?.history ?? hv?.results ?? []);
    } catch { setHistory([]); }

    // Load order items for product images
    if (p.order_id) {
      setLoadingItems(true);
      try {
        const order = await ordersApi.getById(p.order_id);
        setOrderItems((order as any)?.items ?? []);
      } catch { setOrderItems([]); }
      finally { setLoadingItems(false); }
    }
  }

  async function act(fn: () => Promise<any>, successMsg: string, reloadSelected = true) {
    setActionBusy(true);
    try {
      await fn();
      flash(successMsg);
      await load();
      if (reloadSelected && selected) {
        // Re-select the same payment with fresh data
        const refreshed = await paymentsApi.getMy();
        const list: any[] = Array.isArray(refreshed) ? refreshed : (refreshed as any)?.payments ?? (refreshed as any)?.results ?? [];
        const fresh = list.find(p => p.id === selected.id);
        if (fresh) await selectPayment(fresh);
        else setSelected(null);
      }
    } catch (e: any) {
      flash(e?.message ?? "Action failed", "err");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUploadProof() {
    if (!proofFile || !selected) return;
    await act(async () => {
      if (selected.status === "on_hold" || selected.status === "rejected") {
        await paymentsApi.resubmitProof(selected.id, proofFile);
      } else {
        await paymentsApi.uploadProof(selected.id, proofFile);
      }
      setProofFile(null);
      setShowUpload(false);
    }, "Proof uploaded successfully!");
  }

  async function handleCancelPayment() {
    if (!selected || !cancelReason.trim()) { flash("Please enter a reason", "err"); return; }
    await act(() => paymentsApi.cancel(selected.id, cancelReason), "Payment cancelled.");
    setCancelReason("");
    setShowCancel(false);
  }

  async function handleDeletePayment() {
    if (!selected) return;
    await act(async () => {
      // Use delete endpoint if available, otherwise cancel
      if ((paymentsApi as any).delete) {
        await (paymentsApi as any).delete(selected.id);
      } else {
        await paymentsApi.cancel(selected.id, "Deleted by user");
      }
      setSelected(null);
    }, "Payment deleted.", false);
    setShowDelete(false);
  }

  async function handleRetry() {
    if (!selected) return;
    await act(() => paymentsApi.retry(selected.order_id), "New payment created.");
    router.push(`/store/payment?order_id=${selected.order_id}`);
  }

  const canUploadProof = selected && ["pending", "on_hold", "rejected"].includes(selected.status);
  const canCancel      = selected && ["pending", "on_hold"].includes(selected.status);
  const canDelete      = selected && selected.status === "pending";
  const canRetry       = selected && selected.status === "rejected";

  if (loading) return (
    <div style={{ maxWidth: 800, fontFamily: FF }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>My Payments</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 12, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
        ))}
      </div>
      <style>{`@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, fontFamily: FF }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
        * { box-sizing:border-box; }
        .pbtn:hover { opacity:.85 !important; }
        .gbtn:hover { background:#F1F5F9 !important; }
        textarea:focus,input:focus { outline:none; border-color:${ACCENT} !important; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>My Payments</h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>{payments.length} payment{payments.length !== 1 ? "s" : ""} total</p>
      </div>

      {/* Bank details */}
      {bankDetails && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bank Details for Payment</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
            {Object.entries(bankDetails)
              .filter(([k]) => !["id", "created_at", "updated_at", "is_active"].includes(k))
              .map(([k, v]) => v ? (
                <div key={k}>
                  <span style={{ fontSize: 11, color: "#4ADE80", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.replace(/_/g, " ")}: </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>{String(v)}</span>
                </div>
              ) : null)}
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: BRAND, marginBottom: 6 }}>No payments yet</h3>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>When you pay for an order, it will appear here.</p>
          <Link href="/store" style={{ padding: "10px 22px", borderRadius: 8, background: BRAND, color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>Browse Store</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {payments.map((p: any) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.pending;
            const isSelected = selected?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => selectPayment(p)}
                style={{
                  background: isSelected ? "#EFF6FF" : "#fff",
                  border: `1px solid ${isSelected ? ACCENT : "#E2E8F0"}`,
                  borderRadius: 14, padding: "16px 18px",
                  cursor: "pointer", transition: "all .15s",
                  animation: "fadeUp .3s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>#{p.id?.slice(0, 10)}</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: BRAND }}>{formatCurrency(p.amount)}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      {p.order_id && <> · <Link href={`/account/orders/${p.order_id}`} onClick={e => e.stopPropagation()} style={{ color: ACCENT, fontWeight: 600 }}>View Order →</Link></>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.dot, flexShrink: 0 }}/>
                    <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: meta.bg, color: meta.fg }}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Selected payment detail panel ── */}
      {selected && (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px", animation: "fadeUp .25s ease", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: BRAND, margin: "0 0 4px" }}>
                Payment #{selected.id?.slice(0, 10)}
              </h2>
              <span style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: (STATUS_META[selected.status] ?? STATUS_META.pending).bg,
                color: (STATUS_META[selected.status] ?? STATUS_META.pending).fg,
              }}>
                {(STATUS_META[selected.status] ?? STATUS_META.pending).label}
              </span>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "#64748b" }}>✕ Close</button>
          </div>

          {/* FIX #2a: Order items with product images */}
          {loadingItems ? (
            <div style={{ padding: "16px 0", color: "#94a3b8", fontSize: 13 }}>Loading items…</div>
          ) : orderItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Items in this Order</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orderItems.map((item: any, i: number) => {
                  const imgSrc =
                    item.product?.main_image ??
                    (item.product?.images as any)?.[0]?.image_url ??
                    (item.product?.images as any)?.[0]?.url ??
                    (typeof (item.product?.images as any)?.[0] === "string" ? (item.product?.images as any)?.[0] : null) ??
                    item.image_url ??
                    null;
                  return (
                    <div key={item.id ?? i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#F8FAFC", borderRadius: 10 }}>
                      <Thumb src={imgSrc} alt={item.title ?? "Product"} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                        {item.variant && (
                          <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>
                            {Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Qty: {item.quantity}</p>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: BRAND, flexShrink: 0 }}>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: BRAND }}>Total: {formatCurrency(selected.amount)}</span>
              </div>
            </div>
          )}

          {/* Status history */}
          {history.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Status History</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 13 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? ACCENT : "#CBD5E1", marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 600, color: BRAND, textTransform: "capitalize" }}>{h.status?.replace(/_/g, " ")}</span>
                      {h.note && <span style={{ color: "#64748b" }}> — {h.note}</span>}
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{h.created_at ? new Date(h.created_at).toLocaleString() : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proof link */}
          {selected.proof?.file_url && (
            <div style={{ padding: "10px 14px", background: "#F0FDF4", borderRadius: 10, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>📎 Proof of payment uploaded</span>
              <a href={selected.proof.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>View →</a>
            </div>
          )}

          {/* Admin notes */}
          {selected.admin_notes && (
            <div style={{ padding: "10px 14px", background: "#FFF1F2", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#9F1239" }}>
              <strong>Admin note:</strong> {selected.admin_notes}
            </div>
          )}

          {/* ── FIX #2b: Edit / Action buttons ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Upload / Resubmit proof */}
            {canUploadProof && !showUpload && (
              <button onClick={() => setShowUpload(true)} className="pbtn"
                style={{ padding: "11px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer" }}>
                {selected.status === "pending" ? "📎 Upload Proof of Payment" : "↩ Resubmit Proof"}
              </button>
            )}
            {canUploadProof && showUpload && (
              <div style={{ padding: 16, background: "#EFF6FF", borderRadius: 12, border: "1px solid #BFDBFE" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", marginBottom: 12 }}>
                  {selected.status === "pending" ? "Upload Proof of Payment" : "Resubmit Proof"}
                </p>
                <div
                  style={{ border: `2px dashed ${dragOver ? ACCENT : "#BFDBFE"}`, borderRadius: 10, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? "#DBEAFE" : "#F8FAFC", transition: "all .2s", marginBottom: 12 }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setProofFile(f); }}
                >
                  {proofFile
                    ? <p style={{ fontSize: 13, color: BRAND, fontWeight: 600 }}>📄 {proofFile.name}</p>
                    : <p style={{ fontSize: 13, color: "#94A3B8" }}>Drop file or click to browse (image/PDF)</p>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleUploadProof} disabled={!proofFile || actionBusy} className="pbtn"
                    style={{ flex: 1, padding: "11px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer", opacity: (!proofFile || actionBusy) ? 0.6 : 1 }}>
                    {actionBusy ? "Uploading…" : "Submit Proof"}
                  </button>
                  <button onClick={() => setShowUpload(false)} className="gbtn"
                    style={{ padding: "11px 18px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: FF }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Retry rejected payment */}
            {canRetry && (
              <button onClick={handleRetry} disabled={actionBusy} className="pbtn"
                style={{ padding: "11px", borderRadius: 10, background: "#166534", color: "#fff", border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF, cursor: "pointer" }}>
                {actionBusy ? "Processing…" : "↺ Retry Payment"}
              </button>
            )}

            {/* View order */}
            {selected.order_id && (
              <Link href={`/account/orders/${selected.order_id}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "11px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
                📦 View Order
              </Link>
            )}

            {/* Cancel payment */}
            {canCancel && !showCancel && (
              <button onClick={() => setShowCancel(true)} className="gbtn"
                style={{ padding: "11px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: FF, color: "#475569" }}>
                Cancel Payment
              </button>
            )}
            {canCancel && showCancel && (
              <div style={{ padding: 14, background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#9F1239", marginBottom: 8 }}>Cancel this payment?</p>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation…"
                  rows={2}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECDD3", fontSize: 13, fontFamily: FF, resize: "vertical", color: BRAND }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={handleCancelPayment} disabled={actionBusy} className="pbtn"
                    style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#DC2626", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" }}>
                    {actionBusy ? "Cancelling…" : "Confirm Cancel"}
                  </button>
                  <button onClick={() => setShowCancel(false)} className="gbtn"
                    style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: FF }}>
                    Keep
                  </button>
                </div>
              </div>
            )}

            {/* Delete pending payment */}
            {canDelete && !showDelete && (
              <button onClick={() => setShowDelete(true)} className="gbtn"
                style={{ padding: "11px", borderRadius: 10, border: "1px solid #FECDD3", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: FF, color: "#DC2626" }}>
                🗑 Delete Payment
              </button>
            )}
            {canDelete && showDelete && (
              <div style={{ padding: 14, background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#9F1239", marginBottom: 4 }}>Delete this payment record?</p>
                <p style={{ fontSize: 13, color: "#64748B", marginBottom: 14 }}>This is irreversible. Your order will remain, but this payment will be removed.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleDeletePayment} disabled={actionBusy} className="pbtn"
                    style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#DC2626", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" }}>
                    {actionBusy ? "Deleting…" : "Delete"}
                  </button>
                  <button onClick={() => setShowDelete(false)} className="gbtn"
                    style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: FF }}>
                    Keep
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}