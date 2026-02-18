"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ordersApi, paymentsApi } from "@/lib/api";

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  async function load() {
    try {
      const [o, t] = await Promise.allSettled([
        ordersApi.getById(id),
        ordersApi.getTracking(id),
      ]);
      if (o.status === "fulfilled") setOrder(o.value);
      if (t.status === "fulfilled") setTracking(t.value);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (id) load(); }, [id]);

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function act(fn: () => Promise<any>, successMsg: string) {
    setActionLoading(true);
    try { await fn(); flash(successMsg); load(); }
    catch (e: any) { flash(e?.message ?? "Action failed", false); }
    finally { setActionLoading(false); }
  }

  async function handleCancel() {
    if (!confirm("Cancel this order?")) return;
    act(() => ordersApi.cancel(id, "Customer requested cancellation"), "Order cancelled.");
  }

  async function handleReturn() {
    if (!confirm("Request a return for this order?")) return;
    act(() => ordersApi.requestReturn(id, "Customer requested return"), "Return requested.");
  }

  async function handleRefund() {
    if (!refundReason || !refundAmount) return;
    act(() => ordersApi.requestRefund(id, { reason: refundReason, amount: Number(refundAmount) }), "Refund requested.");
    setShowRefund(false); setRefundReason(""); setRefundAmount("");
  }

  async function handleInvoice() {
    try {
      const data = await ordersApi.getInvoice(id) as any;
      if (data?.url) window.open(data.url, "_blank");
      else flash("Invoice not available yet.", false);
    } catch { flash("Invoice not available yet.", false); }
  }

  async function handleProofUpload() {
    if (!proofFile || !order?.payment_id) return;
    act(() => paymentsApi.uploadProof(order.payment_id, proofFile), "Proof uploaded!");
    setProofFile(null);
  }

  if (loading) return <div style={{ padding: 32, color: "#64748b" }}>Loading order...</div>;
  if (!order) return <div style={{ padding: 32, color: "#ef4444" }}>Order not found.</div>;

  const canCancel = ["pending", "paid"].includes(order.status);
  const canReturn = order.status === "completed";
  const canRefund = ["paid", "completed"].includes(order.status);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.back()} style={ghostBtn}>← Back to orders</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>Order #{id.slice(0, 8)}</h1>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {msg && <div style={{ ...banner, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b", marginBottom: 16 }}>{msg.text}</div>}

      {/* ORDER SUMMARY */}
      <div style={card}>
        <h3 style={sectionTitle}>Order Summary</h3>
        <Row label="Total" value={`R ${Number(order.total_amount ?? 0).toLocaleString()}`} />
        <Row label="Status" value={order.status} />
        <Row label="Placed" value={order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"} />
        {order.notes && <Row label="Notes" value={order.notes} />}
      </div>

      {/* ITEMS */}
      {order.items?.length > 0 && (
        <div style={card}>
          <h3 style={sectionTitle}>Items</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th style={th}>Product</th><th style={th}>Qty</th><th style={th}>Price</th>
            </tr></thead>
            <tbody>
              {order.items.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={td}>{item.product_title ?? item.product_id}</td>
                  <td style={td}>{item.quantity}</td>
                  <td style={td}>R {Number(item.price ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TRACKING */}
      {tracking && (
        <div style={card}>
          <h3 style={sectionTitle}>Tracking</h3>
          <Row label="Shipping Status" value={tracking.status ?? "-"} />
          {tracking.carrier && <Row label="Carrier" value={tracking.carrier} />}
          {tracking.tracking_number && <Row label="Tracking #" value={tracking.tracking_number} />}
          {tracking.estimated_delivery && <Row label="Est. Delivery" value={new Date(tracking.estimated_delivery).toLocaleDateString()} />}
          {tracking.events?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>Timeline</div>
              {tracking.events.map((ev: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 13 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? "#009543" : "#cbd5e1", marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{ev.status}</div>
                    <div style={{ color: "#64748b" }}>{ev.location} · {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* UPLOAD PROOF */}
      {order.payment_id && order.status === "pending" && (
        <div style={card}>
          <h3 style={sectionTitle}>Upload Payment Proof</h3>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Upload your payment screenshot or receipt to confirm your payment.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
            <button onClick={handleProofUpload} disabled={!proofFile || actionLoading} style={greenBtn}>Upload Proof</button>
          </div>
        </div>
      )}

      {/* ACTIONS */}
      <div style={card}>
        <h3 style={sectionTitle}>Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handleInvoice} style={btn}>Download Invoice</button>
          {canCancel && <button onClick={handleCancel} disabled={actionLoading} style={{ ...btn, color: "#dc2626", borderColor: "#fca5a5" }}>Cancel Order</button>}
          {canReturn && <button onClick={handleReturn} disabled={actionLoading} style={btn}>Request Return</button>}
          {canRefund && <button onClick={() => setShowRefund(true)} style={btn}>Request Refund</button>}
        </div>
      </div>

      {/* REFUND FORM */}
      {showRefund && (
        <div style={card}>
          <h3 style={sectionTitle}>Request Refund</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={labelStyle}>Reason</label>
              <input style={input} placeholder="Why are you requesting a refund?" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Amount (R)</label>
              <input style={input} type="number" placeholder="Amount to refund" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleRefund} disabled={actionLoading || !refundReason || !refundAmount} style={greenBtn}>Submit Request</button>
              <button onClick={() => setShowRefund(false)} style={btn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{String(value)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ["#fef9c3", "#854d0e"], paid: ["#dcfce7", "#166534"],
    shipped: ["#dbeafe", "#1e40af"], completed: ["#f0fdf4", "#166534"],
    cancelled: ["#fee2e2", "#991b1b"],
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", "#475569"];
  return <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: bg, color }}>{status}</span>;
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" };
const btn: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13 };
const greenBtn: React.CSSProperties = { ...btn, background: "#dcfce7", borderColor: "#86efac", fontWeight: 600, color: "#166534" };
const ghostBtn: React.CSSProperties = { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: 0 };
const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 600, color: "#475569", fontSize: 13, textAlign: "left" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13 };
const banner: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid", fontSize: 14 };
const input: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 };