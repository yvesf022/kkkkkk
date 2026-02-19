"use client";

/**
 * FIX: handleAddNote() was calling adminOrdersAdvancedApi.addNote(id, { note: newNote, is_internal: true })
 * The field must be `content` not `note` per OrderNotePayload schema.
 * Fixed: { content: newNote, is_internal: true }
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi, adminOrdersAdvancedApi, paymentsApi } from "@/lib/api";
import type { Order, Payment } from "@/lib/types";

const FF = "'DM Sans', -apple-system, sans-serif";
const FM = "'DM Mono', monospace";

const STATUS_COLOR: Record<string, { bg: string; fg: string; dot: string }> = {
  pending:   { bg: "#fefce8", fg: "#713f12", dot: "#eab308" },
  paid:      { bg: "#f0fdf4", fg: "#14532d", dot: "#22c55e" },
  shipped:   { bg: "#eff6ff", fg: "#1e3a8a", dot: "#3b82f6" },
  completed: { bg: "#f0fdf4", fg: "#065f46", dot: "#10b981" },
  cancelled: { bg: "#fff1f2", fg: "#881337", dot: "#f43f5e" },
  on_hold:   { bg: "#fff7ed", fg: "#7c2d12", dot: "#f97316" },
  rejected:  { bg: "#fff1f2", fg: "#881337", dot: "#f43f5e" },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_COLOR[status] ?? { bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.fg, letterSpacing: "0.04em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 24px", borderBottom: "1px solid #f1f5f9",
        background: "#fafafa",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f8fafc", gap: 16 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#0f172a", textAlign: "right", fontFamily: mono ? FM : FF, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
      background: ok ? "#0f172a" : "#dc2626", color: "#fff",
      boxShadow: "0 8px 30px rgba(0,0,0,.2)",
      display: "flex", alignItems: "center", gap: 8,
      animation: "toastIn .2s ease",
    }}>
      {ok ? "✓" : "!"} {msg}
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;

  const [order,          setOrder]          = useState<Order | null>(null);
  const [notes,          setNotes]          = useState<any[]>([]);
  const [payments,       setPayments]       = useState<Payment[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [newNote,        setNewNote]        = useState("");
  const [addingNote,     setAddingNote]     = useState(false);
  const [statusOverride, setStatusOverride] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride,   setShowOverride]   = useState(false);
  const [showRefund,     setShowRefund]     = useState(false);
  const [refundAmount,   setRefundAmount]   = useState("");
  const [refundReason,   setRefundReason]   = useState("");
  const [toast,          setToast]          = useState<{ msg: string; ok: boolean } | null>(null);
  const [submitting,     setSubmitting]     = useState(false);

  function flash(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const [data, orderNotes] = await Promise.all([
        ordersApi.getAdminById(id),
        adminOrdersAdvancedApi.getNotes(id).catch(() => []),
      ]);
      setOrder(data);
      setNotes((orderNotes as any) || []);
      // Fetch payments if order has them
      if (data.payments?.length) {
        setPayments(data.payments as Payment[]);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function handleStatusOverride() {
    if (!statusOverride || !overrideReason.trim()) { flash("Select a status and provide a reason", false); return; }
    setSubmitting(true);
    try {
      await adminOrdersAdvancedApi.forceStatus(id, { status: statusOverride, reason: overrideReason });
      flash("Status updated");
      setShowOverride(false); setOverrideReason(""); setStatusOverride("");
      load();
    } catch (e: any) { flash(e?.message ?? "Failed", false); }
    finally { setSubmitting(false); }
  }

  async function handleRefund() {
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0 || !refundReason.trim()) { flash("Enter valid amount and reason", false); return; }
    setSubmitting(true);
    try {
      await adminOrdersAdvancedApi.processRefund(id, { amount: amt, reason: refundReason });
      flash("Refund processed");
      setShowRefund(false); setRefundAmount(""); setRefundReason("");
      load();
    } catch (e: any) { flash(e?.message ?? "Refund failed", false); }
    finally { setSubmitting(false); }
  }

  async function handleCancel() {
    if (!confirm("Cancel this order?")) return;
    setSubmitting(true);
    try {
      await adminOrdersAdvancedApi.forceStatus(id, { status: "cancelled", reason: "Cancelled by admin" });
      flash("Order cancelled");
      load();
    } catch (e: any) { flash(e?.message ?? "Failed", false); }
    finally { setSubmitting(false); }
  }

  // FIX: was { note: newNote } — now correctly { content: newNote } per OrderNotePayload
  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await adminOrdersAdvancedApi.addNote(id, { content: newNote, is_internal: true });
      setNewNote("");
      flash("Note added");
      load();
    } catch (e: any) { flash(e?.message ?? "Failed to add note", false); }
    finally { setAddingNote(false); }
  }

  async function handleHardDelete() {
    if (!confirm("Permanently delete this order? This cannot be undone.")) return;
    try {
      await adminOrdersAdvancedApi.hardDelete(id);
      flash("Order deleted");
      setTimeout(() => router.push("/admin/orders"), 1000);
    } catch (e: any) { flash(e?.message ?? "Delete failed", false); }
  }

  if (loading) return (
    <div style={{ fontFamily: FF, padding: 32 }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}} @keyframes toastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>
      {[200, 320, 160].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 16, marginBottom: 16, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite" }} />
      ))}
    </div>
  );

  if (!order) return (
    <div style={{ fontFamily: FF, textAlign: "center", padding: 80, color: "#64748b" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>◎</div>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Order not found</div>
      <Link href="/admin/orders" style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14 }}>← Back to Orders</Link>
    </div>
  );

  const shortOrderId = order.id.slice(0, 8).toUpperCase();

  return (
    <div style={{ maxWidth: 1000, fontFamily: FF }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes toastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .act-btn:hover:not(:disabled){background:#f8fafc !important; border-color:#94a3b8 !important;}
        .danger-btn:hover:not(:disabled){background:#dc2626 !important;}
        .primary-btn:hover:not(:disabled){background:#1e293b !important;}
        .note-card:hover{border-color:#cbd5e1 !important;}
      `}</style>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Link href="/admin/orders" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>Orders</Link>
            <span style={{ color: "#e2e8f0" }}>›</span>
            <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>#{shortOrderId}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
              Order #{shortOrderId}
            </h1>
            <Badge status={order.status} />
          </div>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0, marginTop: 6 }}>
            Placed {new Date(order.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowOverride(true)}
            className="act-btn"
            style={AB}
          >
            Override Status
          </button>
          <button
            onClick={() => setShowRefund(true)}
            className="act-btn"
            style={AB}
          >
            Refund
          </button>
          <button
            onClick={handleCancel}
            disabled={order.status === "cancelled" || submitting}
            className="act-btn"
            style={{ ...AB, opacity: order.status === "cancelled" ? 0.4 : 1 }}
          >
            Cancel Order
          </button>
          <button
            onClick={handleHardDelete}
            className="danger-btn"
            style={{ ...AB, background: "#dc2626", color: "#fff", border: "1px solid #dc2626" }}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Order Items */}
          <Section title="Order Items">
            {order.items?.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {order.items.map((item) => (
                  <div key={item.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 0", borderBottom: "1px solid #f1f5f9", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 8, background: "#f8fafc",
                        border: "1px solid #e2e8f0", display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0, fontSize: 18,
                      }}>
                        📦
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, fontFamily: FM }}>
                          {item.product_id?.slice(0, 12)}
                          {item.variant_id && <span> · Variant: {item.variant_id.slice(0, 8)}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                        M {item.price.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>× {item.quantity}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>M {order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "20px 0" }}>No items</div>
            )}
          </Section>

          {/* Internal Notes */}
          <Section title={`Internal Notes ${notes.length > 0 ? `(${notes.length})` : ""}`}>
            {notes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {notes.map((n) => (
                  <div key={n.id} className="note-card" style={{
                    background: "#fffbeb", border: "1px solid #fde68a",
                    borderRadius: 10, padding: "12px 16px",
                    transition: "border-color .15s",
                  }}>
                    <p style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6, margin: "0 0 6px" }}>
                      {n.content ?? n.note}
                    </p>
                    <span style={{ fontSize: 11, color: "#92400e", fontFamily: FM }}>
                      {new Date(n.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an internal note visible only to admins…"
                rows={3}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid #e2e8f0", fontSize: 13, resize: "vertical",
                  fontFamily: FF, boxSizing: "border-box", outline: "none",
                  color: "#0f172a", background: "#fafafa",
                }}
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="primary-btn"
                style={{
                  marginTop: 10, padding: "9px 18px", borderRadius: 10,
                  border: "none", background: "#0f172a", color: "#fff",
                  fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FF,
                  opacity: addingNote || !newNote.trim() ? 0.55 : 1,
                  transition: "background .15s",
                }}
              >
                {addingNote ? "Adding…" : "Add Note"}
              </button>
            </div>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Order Details */}
          <Section title="Order Details">
            <Field label="Order ID" value={order.id.slice(0, 16) + "…"} mono />
            <Field label="Total" value={`M ${order.total_amount.toFixed(2)}`} />
            <Field label="Order Status" value={<Badge status={order.status} />} />
            <Field label="Payment Status" value={order.payment_status ? <Badge status={order.payment_status} /> : "—"} />
            <Field label="Shipping Status" value={<Badge status={order.shipping_status} />} />
            {order.tracking_number && <Field label="Tracking #" value={order.tracking_number} mono />}
            {order.notes && <Field label="Customer Notes" value={order.notes} />}
          </Section>

          {/* Shipping Address */}
          {order.shipping_address && (
            <Section title="Shipping Address">
              {Object.entries(order.shipping_address).filter(([, v]) => v).map(([k, v]) => (
                <Field key={k} label={k.replace(/_/g, " ")} value={String(v)} />
              ))}
            </Section>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <Section title="Payments">
              {payments.map((p) => (
                <div key={p.id} style={{ marginBottom: 10 }}>
                  <Field label="Payment ID" value={p.id.slice(0, 12) + "…"} mono />
                  <Field label="Amount" value={`M ${p.amount.toFixed(2)}`} />
                  <Field label="Method" value={p.method.replace("_", " ")} />
                  <Field label="Status" value={<Badge status={p.status} />} />
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>

      {/* ── Status Override Modal ── */}
      {showOverride && (
        <Modal title="Override Order Status" onClose={() => setShowOverride(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              This bypasses the normal order flow. Use with caution.
            </p>
            <div>
              <label style={LS}>New Status</label>
              <select
                value={statusOverride}
                onChange={(e) => setStatusOverride(e.target.value)}
                style={{ ...IS, cursor: "pointer" }}
              >
                <option value="">Select status…</option>
                {["pending", "paid", "shipped", "completed", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LS}>Reason (required)</label>
              <input
                style={IS}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for manual override…"
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowOverride(false)} style={AB}>Cancel</button>
              <button
                onClick={handleStatusOverride}
                disabled={submitting || !statusOverride || !overrideReason.trim()}
                className="primary-btn"
                style={{ ...AB, background: "#0f172a", color: "#fff", border: "1px solid #0f172a", opacity: submitting || !statusOverride || !overrideReason.trim() ? 0.55 : 1 }}
              >
                {submitting ? "Applying…" : "Apply Override"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Refund Modal ── */}
      {showRefund && (
        <Modal title="Process Refund" onClose={() => setShowRefund(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={LS}>Refund Amount (M)</label>
              <input
                type="number" step="0.01" min="0.01"
                style={IS}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Max: ${order.total_amount.toFixed(2)}`}
              />
            </div>
            <div>
              <label style={LS}>Reason</label>
              <textarea
                rows={3}
                style={{ ...IS, resize: "vertical" }}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund…"
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRefund(false)} style={AB}>Cancel</button>
              <button
                onClick={handleRefund}
                disabled={submitting || !refundAmount || !refundReason.trim()}
                className="primary-btn"
                style={{ ...AB, background: "#0f172a", color: "#fff", border: "1px solid #0f172a", opacity: submitting || !refundAmount || !refundReason.trim() ? 0.55 : 1 }}
              >
                {submitting ? "Processing…" : "Process Refund"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: 28, width: "90%", maxWidth: 460,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "fadeUp .2s ease",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const AB: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0",
  background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all .15s",
};
const IS: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
  boxSizing: "border-box", outline: "none", color: "#0f172a", background: "#fafafa",
};
const LS: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em",
};