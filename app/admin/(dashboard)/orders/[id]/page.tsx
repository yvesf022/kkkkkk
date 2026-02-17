"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ordersApi, adminOrdersAdvancedApi } from "@/lib/api";
import type { Order, OrderNote, OrderStatus } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   MALOTI FORMAT
====================== */

const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

/* ======================
   PAGE
====================== */

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [shippingStatus, setShippingStatus] = useState("");
  const [tracking, setTracking] = useState("");

  // Advanced features
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [showStatusOverride, setShowStatusOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus>("pending");
  const [overrideReason, setOverrideReason] = useState("");

  /* ======================
     LOAD ORDER
  ====================== */

  async function load() {
    try {
      const data = await ordersApi.getAdminById(id);
      setOrder(data);
      setShippingStatus(data.shipping_status || "");
      setTracking(data.tracking_number || "");
      
      // Load notes if available
      if (data.order_notes) {
        setNotes(data.order_notes);
      }
    } catch {
      toast.error("Unable to load order");
      router.replace("/admin/orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ======================
     LOAD NOTES
  ====================== */

  async function loadNotes() {
    try {
      const data = await adminOrdersAdvancedApi.getNotes(id);
      setNotes(data as OrderNote[]);
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  }

  /* ======================
     UPDATE SHIPPING
  ====================== */

  async function updateShipping() {
    if (!order) return;

    if (order.payment_status !== "paid") {
      toast.error("Shipping cannot be updated until payment is approved");
      return;
    }

    setUpdating(true);

    try {
      await ordersApi.updateShipping(order.id, {
        status: shippingStatus,
      });

      toast.success("Shipping updated");
      await load();
    } catch {
      toast.error("Failed to update shipping");
    } finally {
      setUpdating(false);
    }
  }

  /* ======================
     PROCESS REFUND
  ====================== */

  async function handleRefund() {
    if (!order) return;

    setUpdating(true);

    try {
      if (refundAmount && parseFloat(refundAmount) < order.total_amount) {
        // Partial refund
        await adminOrdersAdvancedApi.processPartialRefund(order.id, {
          amount: parseFloat(refundAmount),
          reason: refundReason,
        });
        toast.success("Partial refund processed");
      } else {
        // Full refund
        await adminOrdersAdvancedApi.processRefund(order.id, { reason: refundReason, amount: order.total_amount });
        toast.success("Full refund processed");
      }

      setShowRefund(false);
      setRefundAmount("");
      setRefundReason("");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to process refund");
    } finally {
      setUpdating(false);
    }
  }

  /* ======================
     ADD NOTE
  ====================== */

  async function handleAddNote() {
    if (!newNote.trim()) return;

    setUpdating(true);

    try {
      await adminOrdersAdvancedApi.addNote(id, {
        note: newNote,
        is_internal: isInternal,
      });

      toast.success("Note added");
      setNewNote("");
      setIsInternal(false);
      await loadNotes();
    } catch (error: any) {
      toast.error(error.message || "Failed to add note");
    } finally {
      setUpdating(false);
    }
  }

  /* ======================
     DELETE NOTE
  ====================== */

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;

    try {
      await adminOrdersAdvancedApi.deleteNote(id, noteId);
      toast.success("Note deleted");
      await loadNotes();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    }
  }

  /* ======================
     FORCE STATUS OVERRIDE
  ====================== */

  async function handleStatusOverride() {
    if (!confirm(`Force order status to ${overrideStatus}?`)) return;

    setUpdating(true);

    try {
      await adminOrdersAdvancedApi.forceStatus(id, {
        status: overrideStatus,
        reason: overrideReason,
      });

      toast.success("Order status overridden");
      setShowStatusOverride(false);
      setOverrideReason("");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to override status");
    } finally {
      setUpdating(false);
    }
  }

  /* ======================
     HARD DELETE
  ====================== */

  async function handleHardDelete() {
    if (!confirm("Permanently delete this order? This cannot be undone!")) return;

    setUpdating(true);

    try {
      await adminOrdersAdvancedApi.hardDelete(id);
      toast.success("Order deleted permanently");
      router.replace("/admin/orders");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete order");
    } finally {
      setUpdating(false);
    }
  }

  /* ======================
     CANCEL ORDER
  ====================== */

  async function handleCancelOrder() {
    if (!confirm("Cancel this order?")) return;

    setUpdating(true);

    try {
      await adminOrdersAdvancedApi.forceStatus(id, { status: overrideStatus, reason: overrideReason });
      toast.success("Order cancelled");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return null;

  const canShip = order.payment_status === "paid";

  return (
    <div style={{ display: "grid", gap: 32, maxWidth: 1200 }}>
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            Order #{order.id.slice(0, 8)}
          </h1>
          <p style={{ opacity: 0.6 }}>
            Created {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowRefund(!showRefund)}
            style={actionBtn}
          >
            💰 Refund
          </button>
          
          <button
            onClick={() => setShowNotes(!showNotes)}
            style={actionBtn}
          >
            📝 Notes
          </button>

          <button
            onClick={() => setShowStatusOverride(!showStatusOverride)}
            style={actionBtn}
          >
            ⚡ Override
          </button>

          {order.status !== "cancelled" && (
            <button
              onClick={handleCancelOrder}
              disabled={updating}
              style={{ ...actionBtn, background: "#ef4444" }}
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleHardDelete}
            disabled={updating}
            style={{ ...actionBtn, background: "#991b1b" }}
          >
            🗑️ Delete
          </button>
        </div>
      </header>

      {/* REFUND SECTION */}
      {showRefund && (
        <section className="card">
          <h3 style={{ fontWeight: 900, marginBottom: 16 }}>Process Refund</h3>
          
          <div style={{ display: "grid", gap: 12 }}>
            <input
              type="number"
              placeholder={`Full amount: ${fmtM(order.total_amount)}`}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              style={{ padding: 10, borderRadius: 8 }}
            />

            <textarea
              placeholder="Refund reason..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              style={{ padding: 10, borderRadius: 8, minHeight: 80 }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleRefund}
                disabled={updating}
                style={approveBtn}
              >
                {updating ? "Processing..." : "Process Refund"}
              </button>

              <button
                onClick={() => setShowRefund(false)}
                style={cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* NOTES SECTION */}
      {showNotes && (
        <section className="card">
          <h3 style={{ fontWeight: 900, marginBottom: 16 }}>Order Notes</h3>

          {/* Add note */}
          <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
            <textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{ padding: 10, borderRadius: 8, minHeight: 80 }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              Internal note (customer won't see)
            </label>

            <button
              onClick={handleAddNote}
              disabled={updating || !newNote.trim()}
              style={approveBtn}
            >
              Add Note
            </button>
          </div>

          {/* Display notes */}
          <div style={{ display: "grid", gap: 12 }}>
            {notes.length === 0 && (
              <p style={{ opacity: 0.6 }}>No notes yet</p>
            )}

            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: note.is_internal ? "#fef3c7" : "#f3f4f6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>
                    {note.is_internal && "🔒 "}
                    {note.content}
                  </p>
                  <p style={{ fontSize: 12, opacity: 0.6 }}>
                    {new Date(note.created_at).toLocaleString()}
                    {note.created_by && ` • ${note.created_by}`}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteNote(note.id)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "#fee2e2",
                    color: "#991b1b",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STATUS OVERRIDE SECTION */}
      {showStatusOverride && (
        <section className="card">
          <h3 style={{ fontWeight: 900, marginBottom: 16 }}>Force Status Override</h3>

          <div style={{ display: "grid", gap: 12 }}>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)}
              style={{ padding: 10, borderRadius: 8 }}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
            </select>

            <input
              placeholder="Reason for override..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              style={{ padding: 10, borderRadius: 8 }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleStatusOverride}
                disabled={updating}
                style={{ ...approveBtn, background: "#ef4444" }}
              >
                {updating ? "Processing..." : "Force Override"}
              </button>

              <button
                onClick={() => setShowStatusOverride(false)}
                style={cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SUMMARY */}
      <section className="card">
        <div>
          <b>Total:</b> {fmtM(order.total_amount)}
        </div>

        <StatusBadge
          label={paymentLabel(order.payment_status || "pending")}
          type="payment"
          status={order.payment_status || "pending"}
        />

        <StatusBadge
          label={shippingLabel(order.shipping_status)}
          type="shipping"
          status={order.shipping_status || "none"}
        />

        {order.refund_status && order.refund_status !== "none" && (
          <div style={{ marginTop: 12 }}>
            <b>Refund Status:</b> {order.refund_status}
            {order.refund_amount && ` - ${fmtM(order.refund_amount)}`}
          </div>
        )}
      </section>

      {/* SHIPPING SECTION */}
      <section className="card">
        <h3 style={{ fontWeight: 900 }}>Shipping Management</h3>

        {!canShip && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "#fef3c7",
              color: "#92400e",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Payment must be approved before shipping.
          </div>
        )}

        <select
          disabled={!canShip}
          value={shippingStatus}
          onChange={(e) => setShippingStatus(e.target.value)}
          style={{ padding: 10, borderRadius: 8 }}
        >
          <option value="">Not shipped</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>

        <input
          disabled={!canShip}
          placeholder="Tracking number"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          style={{ padding: 10, borderRadius: 8 }}
        />

        <button
          disabled={!canShip || updating}
          onClick={updateShipping}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            fontWeight: 800,
            border: "none",
            background: canShip ? "#111827" : "#9ca3af",
            color: "white",
            cursor: canShip ? "pointer" : "not-allowed",
          }}
        >
          {updating ? "Updating..." : "Update Shipping"}
        </button>
      </section>

      {/* ITEMS */}
      <section className="card">
        <h3 style={{ fontWeight: 900, marginBottom: 16 }}>Items</h3>

        <div style={{ display: "grid", gap: 16 }}>
          {order.items?.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 10,
                borderBottom: "1px solid #eee",
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>{item.title}</div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  Qty: {item.quantity}
                </div>
              </div>

              <div style={{ fontWeight: 800 }}>
                {fmtM(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ======================
   STATUS BADGE
====================== */

function StatusBadge({
  label,
  type,
  status,
}: {
  label: string;
  type: "payment" | "shipping";
  status: string;
}) {
  let bg = "#f3f4f6";
  let text = "#374151";

  if (type === "payment") {
    if (status === "pending") {
      bg = "#fef3c7";
      text = "#92400e";
    }
    if (status === "on_hold") {
      bg = "#ffedd5";
      text = "#c2410c";
    }
    if (status === "paid") {
      bg = "#dcfce7";
      text = "#166534";
    }
    if (status === "rejected") {
      bg = "#fee2e2";
      text = "#991b1b";
    }
  }

  if (type === "shipping") {
    if (status === "processing") {
      bg = "#dbeafe";
      text = "#1e40af";
    }
    if (status === "shipped") {
      bg = "#e0e7ff";
      text = "#3730a3";
    }
    if (status === "delivered") {
      bg = "#dcfce7";
      text = "#166534";
    }
  }

  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: bg,
        color: text,
        fontWeight: 800,
        fontSize: 13,
        display: "inline-block",
      }}
    >
      {label}
    </div>
  );
}

/* ======================
   LABEL HELPERS
====================== */

function paymentLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending Payment";
    case "on_hold":
      return "Awaiting Review";
    case "paid":
      return "Payment Approved";
    case "rejected":
      return "Payment Rejected";
    default:
      return status;
  }
}

function shippingLabel(status: string | null) {
  if (!status) return "Not Shipped";
  if (status === "processing") return "Processing";
  if (status === "shipped") return "Shipped";
  if (status === "delivered") return "Delivered";
  return status;
}

/* ======================
   BUTTON STYLES
====================== */

const actionBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#3b82f6",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const approveBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "#6b7280",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};









