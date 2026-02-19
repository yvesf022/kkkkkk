"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ordersApi, paymentsApi } from "@/lib/api";
import type { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const statusColors: Record<string, [string, string]> = {
  pending:   ["#fef9c3", "#854d0e"],
  paid:      ["#dcfce7", "#166534"],
  shipped:   ["#dbeafe", "#1e40af"],
  completed: ["#f0fdf4", "#166534"],
  cancelled: ["#fee2e2", "#991b1b"],
};

const shippingColors: Record<string, [string, string]> = {
  pending:    ["#f1f5f9", "#475569"],
  processing: ["#fef9c3", "#854d0e"],
  shipped:    ["#dbeafe", "#1e40af"],
  delivered:  ["#dcfce7", "#166534"],
  returned:   ["#fee2e2", "#991b1b"],
};

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Modals
  const [showRefund, setShowRefund] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  async function load() {
    try {
      const [o, t] = await Promise.allSettled([
        ordersApi.getById(id),
        ordersApi.getTracking(id),
      ]);
      if (o.status === "fulfilled") setOrder(o.value as Order);
      if (t.status === "fulfilled") setTracking(t.value);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 5000); }

  async function act(fn: () => Promise<any>, successMsg: string) {
    setActionLoading(true);
    try { await fn(); flash(successMsg); load(); }
    catch (e: any) { flash(e?.message ?? "Action failed", false); }
    finally { setActionLoading(false); }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    await act(() => ordersApi.cancel(id, cancelReason), "Order cancelled.");
    setShowCancel(false);
  }

  async function handleReturn() {
    if (!returnReason.trim()) return;
    await act(() => ordersApi.requestReturn(id, returnReason), "Return requested. We'll be in touch.");
    setShowReturn(false);
  }

  async function handleRefund() {
    if (!refundReason || !refundAmount) return;
    await act(() => ordersApi.requestRefund(id, { reason: refundReason, amount: Number(refundAmount) }), "Refund request submitted.");
    setShowRefund(false);
    setRefundReason(""); setRefundAmount("");
  }

  async function handleInvoice() {
    try {
      const data = await ordersApi.getInvoice(id) as any;
      if (data?.url) window.open(data.url, "_blank");
      else if (data?.invoice_url) window.open(data.invoice_url, "_blank");
      else flash("Invoice not yet available for this order.", false);
    } catch { flash("Invoice not available yet.", false); }
  }

  async function handleProofUpload() {
    if (!proofFile || !order) return;
    const paymentId = (order as any).payment_id ?? order.payments?.[0]?.id;
    if (!paymentId) { flash("No payment found for this order.", false); return; }
    await act(() => paymentsApi.uploadProof(paymentId, proofFile), "Payment proof uploaded!");
    setProofFile(null);
  }

  /* ---- Loading / not found ---- */
  if (loading) return <div style={{ padding: 32, color: "#64748b" }}>Loading order...</div>;
  if (!order) return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Order not found</div>
      <Link href="/account/orders" style={linkBtnSt}>Back to Orders</Link>
    </div>
  );

  const [orderBg, orderColor] = statusColors[order.status] ?? ["#f1f5f9", "#475569"];
  const [shipBg, shipColor] = shippingColors[order.shipping_status] ?? ["#f1f5f9", "#475569"];

  const canCancel = ["pending", "paid"].includes(order.status);
  const canReturn = order.status === "completed";
  const canRefund = ["paid", "completed"].includes(order.status) && order.refund_status !== "completed";
  const paymentId = (order as any).payment_id ?? order.payments?.[0]?.id;
  const showUploadProof = !!paymentId && order.status === "pending";

  return (
    <div style={{ maxWidth: 780 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.back()} style={ghostBtnSt}>← Back to Orders</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: "#0f172a" }}>Order #{id.slice(0, 8).toUpperCase()}</h1>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Placed {new Date(order.created_at).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: orderBg, color: orderColor }}>
              Order: {order.status}
            </span>
            <span style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: shipBg, color: shipColor }}>
              Shipping: {order.shipping_status}
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <div style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid", fontSize: 14, marginBottom: 20, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b" }}>
          {msg.text}
        </div>
      )}

      {/* ORDER ITEMS */}
      {order.items && order.items.length > 0 && (
        <div style={card}>
          <div style={cardTitle}>Items Ordered</div>
          <div style={{ display: "grid", gap: 12 }}>
            {order.items.map((item, i) => (
              <div key={item.id ?? i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: i < order.items!.length - 1 ? "1px solid #f8fafc" : "none" }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: "#f1f5f9", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.product?.main_image ? (
                    <img src={item.product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : <span style={{ fontSize: 20 }}>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{item.title ?? item.product?.title ?? "Product"}</div>
                  {item.variant && <div style={{ fontSize: 12, color: "#64748b" }}>{item.variant.title}</div>}
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Qty: {item.quantity}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", flexShrink: 0 }}>
                  {formatCurrency(item.subtotal ?? item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Order total */}
          <div style={{ borderTop: "2px solid #f1f5f9", paddingTop: 14, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: "#0f172a" }}>{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      )}

      {/* SHIPPING ADDRESS */}
      {order.shipping_address && (
        <div style={card}>
          <div style={cardTitle}>Shipping Address</div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: "#334155" }}>
            <div style={{ fontWeight: 700 }}>{order.shipping_address.full_name}</div>
            <div>{order.shipping_address.address}, {order.shipping_address.city}</div>
            {order.shipping_address.district && <div>{order.shipping_address.district}</div>}
            {order.shipping_address.postal_code && <div>{order.shipping_address.postal_code}</div>}
            {order.shipping_address.phone && <div style={{ color: "#64748b" }}>{order.shipping_address.phone}</div>}
          </div>
        </div>
      )}

      {/* TRACKING */}
      {tracking && (
        <div style={card}>
          <div style={cardTitle}>Shipment Tracking</div>
          <div style={{ display: "grid", gap: 10, marginBottom: tracking.events?.length ? 20 : 0 }}>
            {tracking.status && <InfoRow label="Status" value={tracking.status} />}
            {tracking.carrier && <InfoRow label="Carrier" value={tracking.carrier} />}
            {tracking.tracking_number && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <span style={{ color: "#64748b" }}>Tracking #</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{tracking.tracking_number}</span>
                  <button onClick={() => navigator.clipboard.writeText(tracking.tracking_number).then(() => flash("Copied!"))} style={{ ...ghostBtnSt, fontSize: 11, padding: "2px 8px" }}>Copy</button>
                </div>
              </div>
            )}
            {tracking.estimated_delivery && <InfoRow label="Est. Delivery" value={new Date(tracking.estimated_delivery).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })} />}
          </div>

          {tracking.events?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Timeline</div>
              <div style={{ position: "relative", paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: "#e5e7eb" }} />
                {tracking.events.map((ev: any, i: number) => (
                  <div key={i} style={{ position: "relative", display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={{ position: "absolute", left: -16, top: 3, width: 10, height: 10, borderRadius: "50%", background: i === 0 ? "#009543" : "#cbd5e1", border: "2px solid #fff", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{ev.status}</div>
                      {ev.location && <div style={{ fontSize: 12, color: "#64748b" }}>{ev.location}</div>}
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REFUND / RETURN STATUS */}
      {(order.refund_status && order.refund_status !== "none") && (
        <div style={{ ...card, background: "#fef9c3", borderColor: "#fde047" }}>
          <div style={cardTitle}>Refund Status</div>
          <InfoRow label="Status" value={order.refund_status} />
          {order.refund_amount && <InfoRow label="Amount" value={formatCurrency(order.refund_amount)} />}
          {order.refund_reason && <InfoRow label="Reason" value={order.refund_reason} />}
        </div>
      )}

      {(order.return_status && order.return_status !== "none") && (
        <div style={{ ...card, background: "#eff6ff", borderColor: "#bfdbfe" }}>
          <div style={cardTitle}>Return Status</div>
          <InfoRow label="Status" value={order.return_status} />
          {order.return_reason && <InfoRow label="Reason" value={order.return_reason} />}
        </div>
      )}

      {/* UPLOAD PROOF */}
      {showUploadProof && (
        <div style={card}>
          <div style={cardTitle}>Upload Payment Proof</div>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
            Upload your payment screenshot or receipt to confirm your payment.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
            <button onClick={handleProofUpload} disabled={!proofFile || actionLoading} style={{ ...greenBtnSt, opacity: !proofFile ? 0.6 : 1 }}>
              Upload Proof
            </button>
          </div>
        </div>
      )}

      {/* ORDER NOTES */}
      {order.notes && (
        <div style={{ ...card, background: "#fafafa" }}>
          <div style={cardTitle}>Order Notes</div>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: 0 }}>{order.notes}</p>
        </div>
      )}

      {/* ACTIONS */}
      <div style={card}>
        <div style={cardTitle}>Actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handleInvoice} style={outlineBtnSt}>📄 Download Invoice</button>
          {canCancel && (
            <button onClick={() => setShowCancel(true)} style={{ ...outlineBtnSt, color: "#dc2626", borderColor: "#fca5a5" }}>
              ✕ Cancel Order
            </button>
          )}
          {canReturn && (
            <button onClick={() => setShowReturn(true)} style={outlineBtnSt}>
              ↩ Request Return
            </button>
          )}
          {canRefund && (
            <button onClick={() => setShowRefund(true)} style={outlineBtnSt}>
              💰 Request Refund
            </button>
          )}
          <Link href={`/store/payment?order_id=${id}`} style={{ ...outlineBtnSt as any, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            💳 View Payment
          </Link>
        </div>
      </div>

      {/* CANCEL MODAL */}
      {showCancel && (
        <Modal title="Cancel Order" onClose={() => setShowCancel(false)}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Please provide a reason for cancelling this order.</p>
          <label style={labelSt}>Reason *</label>
          <input style={inputSt} placeholder="Why are you cancelling?" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={handleCancel} disabled={actionLoading || !cancelReason} style={{ ...dangerBtnSt, opacity: !cancelReason ? 0.6 : 1 }}>
              {actionLoading ? "Cancelling..." : "Confirm Cancel"}
            </button>
            <button onClick={() => setShowCancel(false)} style={outlineBtnSt}>Back</button>
          </div>
        </Modal>
      )}

      {/* RETURN MODAL */}
      {showReturn && (
        <Modal title="Request Return" onClose={() => setShowReturn(false)}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Tell us why you'd like to return this order.</p>
          <label style={labelSt}>Reason *</label>
          <textarea style={{ ...inputSt, height: 80, resize: "vertical" }} placeholder="Reason for return..." value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={handleReturn} disabled={actionLoading || !returnReason} style={{ ...greenBtnSt, opacity: !returnReason ? 0.6 : 1 }}>
              {actionLoading ? "Submitting..." : "Submit Return Request"}
            </button>
            <button onClick={() => setShowReturn(false)} style={outlineBtnSt}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* REFUND MODAL */}
      {showRefund && (
        <Modal title="Request Refund" onClose={() => setShowRefund(false)}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            Max refund amount: <strong>{formatCurrency(order.total_amount)}</strong>
          </p>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={labelSt}>Reason *</label>
              <input style={inputSt} placeholder="Why are you requesting a refund?" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
            <div>
              <label style={labelSt}>Amount (R) *</label>
              <input style={inputSt} type="number" min={1} max={order.total_amount} placeholder={`Max R${order.total_amount}`} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={handleRefund} disabled={actionLoading || !refundReason || !refundAmount} style={{ ...greenBtnSt, opacity: !refundReason || !refundAmount ? 0.6 : 1 }}>
              {actionLoading ? "Submitting..." : "Submit Refund Request"}
            </button>
            <button onClick={() => setShowRefund(false)} style={outlineBtnSt}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#0f172a" }}>{value}</span>
    </div>
  );
}

/* ---- Styles ---- */
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, marginBottom: 16 };
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 800, marginBottom: 16, color: "#0f172a" };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box", outline: "none" };
const labelSt: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const outlineBtnSt: React.CSSProperties = { padding: "9px 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#475569" };
const greenBtnSt: React.CSSProperties = { padding: "9px 16px", borderRadius: 9, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const dangerBtnSt: React.CSSProperties = { ...greenBtnSt, background: "#dc2626" };
const ghostBtnSt: React.CSSProperties = { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, padding: "4px 0", fontWeight: 500 };
const linkBtnSt: React.CSSProperties = { padding: "10px 20px", borderRadius: 10, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 };