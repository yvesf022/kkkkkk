"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/lib/auth";
import { ordersApi, paymentsApi } from "@/lib/api";
import type { Order } from "@/lib/types";

const fmtM = (v: number) =>
  `M ${Math.round(v).toLocaleString("en-ZA")}`;

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);

  // Advanced features
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [tracking, setTracking] = useState<any>(null);

  /* ======================
     AUTH
  ====================== */

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [authLoading, user, router]);

  /* ======================
     LOAD ORDER
  ====================== */

  async function loadOrder() {
    try {
      const found = await ordersApi.getById(id);
      setOrder(found);

      // Pre-populate paymentId if a payment already exists
      const existingPayment = found.payments?.[0];
      if (existingPayment) {
        setPaymentId(existingPayment.id);
      }
    } catch {
      toast.error("Unable to access this order");
      router.replace("/account/orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    loadOrder();
  }, [id, authLoading, user]);

  /* ======================
     LOAD BANK DETAILS
  ====================== */

  useEffect(() => {
    async function loadBankDetails() {
      try {
        const data = await paymentsApi.getBankDetails();
        setBankDetails(data);
      } catch {
        console.error("Failed to load bank details");
      }
    }

    if (order?.status === "pending") {
      loadBankDetails();
    }
  }, [order]);

  /* ======================
     CREATE PAYMENT
  ====================== */

  async function handleCreatePayment() {
    if (!order) return;
    setCreatingPayment(true);

    try {
      const result: any = await paymentsApi.create(order.id);
      setPaymentId(result.payment_id);
      toast.success("Payment created. Please transfer and upload proof.");
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment");
    } finally {
      setCreatingPayment(false);
    }
  }

  /* ======================
     UPLOAD PROOF
  ====================== */

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !paymentId) return;

    if (
      !file.type.startsWith("image/") &&
      file.type !== "application/pdf"
    ) {
      toast.error("Only images or PDF allowed");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15MB");
      return;
    }

    setUploading(true);

    try {
      await paymentsApi.uploadProof(paymentId, file);
      toast.success("Payment proof uploaded successfully");
      if (fileRef.current) fileRef.current.value = "";
      await loadOrder();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  /* ======================
     CANCEL ORDER
  ====================== */

  async function handleCancelOrder() {
    if (!order) return;

    if (!confirm("Cancel this order?")) return;

    try {
      await ordersApi.cancel(order.id, { reason: cancelReason });
      toast.success("Order cancelled");
      setShowCancel(false);
      setCancelReason("");
      await loadOrder();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    }
  }

  /* ======================
     REQUEST RETURN
  ====================== */

  async function handleRequestReturn() {
    if (!order) return;

    try {
      await ordersApi.requestReturn(order.id, { reason: returnReason });
      toast.success("Return request submitted");
      setShowReturn(false);
      setReturnReason("");
      await loadOrder();
    } catch (err: any) {
      toast.error(err.message || "Failed to request return");
    }
  }

  /* ======================
     REQUEST REFUND
  ====================== */

  async function handleRequestRefund() {
    if (!order) return;

    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      await ordersApi.requestRefund(order.id, {
        reason: refundReason,
        amount,
      });
      toast.success("Refund request submitted");
      setShowRefund(false);
      setRefundReason("");
      setRefundAmount("");
      await loadOrder();
    } catch (err: any) {
      toast.error(err.message || "Failed to request refund");
    }
  }

  /* ======================
     LOAD TRACKING
  ====================== */

  async function loadTracking() {
    try {
      const data = await ordersApi.getTracking(id);
      setTracking(data);
    } catch (err: any) {
      toast.error(err.message || "Tracking not available");
    }
  }

  /* ======================
     DOWNLOAD INVOICE
  ====================== */

  async function downloadInvoice() {
    try {
      const data = await ordersApi.getInvoice(id);
      // Assuming the API returns a URL or blob
      window.open((data as any).invoice_url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Invoice not available");
    }
  }

  /* ======================
     STATES
  ====================== */

  if (authLoading) return <div className="pageContentWrap">Loading…</div>;
  if (!user) return null;
  if (loading || !order)
    return <div className="pageContentWrap">Loading order…</div>;

  const isOrderPending = order.status === "pending";
  const isOrderPaid = order.status === "paid";
  const isOrderShipped = order.status === "shipped";
  const isOrderCompleted = order.status === "completed";
  const isCancelled = order.status === "cancelled";

  const paymentStatus = order.payment_status;
  const isOnHold = paymentStatus === "on_hold";
  const isRejected = paymentStatus === "rejected";

  const canCreatePayment = isOrderPending && !paymentId;
  const canUploadProof = isOrderPending && !!paymentId && !isOnHold;
  const canCancel = isOrderPending && !isCancelled;
  const canRequestReturn = (isOrderShipped || isOrderCompleted) && !order.return_status;
  const canRequestRefund = isOrderPaid && !order.refund_status;

  return (
    <div className="pageContentWrap" style={{ maxWidth: 1000 }}>
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: 12 }}>
          {isOrderShipped && (
            <button onClick={loadTracking} className="btn btnSecondary">
              📦 Track
            </button>
          )}

          {isOrderPaid && (
            <button onClick={downloadInvoice} className="btn btnSecondary">
              📄 Invoice
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="btn"
              style={{ background: "#ef4444", color: "white" }}
            >
              ❌ Cancel
            </button>
          )}

          {canRequestReturn && (
            <button onClick={() => setShowReturn(true)} className="btn btnSecondary">
              🔄 Return
            </button>
          )}

          {canRequestRefund && (
            <button onClick={() => setShowRefund(true)} className="btn btnSecondary">
              💰 Refund
            </button>
          )}
        </div>
      </header>

      {/* CANCEL ORDER SECTION */}
      {showCancel && (
        <div className="card" style={{ background: "#fef3c7" }}>
          <h3 style={{ fontWeight: 900, marginBottom: 12 }}>Cancel Order</h3>
          <textarea
            placeholder="Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, minHeight: 80 }}
          />
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={handleCancelOrder} className="btn" style={{ background: "#ef4444", color: "white" }}>
              Confirm Cancel
            </button>
            <button onClick={() => setShowCancel(false)} className="btn btnGhost">
              Nevermind
            </button>
          </div>
        </div>
      )}

      {/* RETURN REQUEST SECTION */}
      {showReturn && (
        <div className="card" style={{ background: "#dbeafe" }}>
          <h3 style={{ fontWeight: 900, marginBottom: 12 }}>Request Return</h3>
          <textarea
            placeholder="Reason for return..."
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, minHeight: 80 }}
          />
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={handleRequestReturn} className="btn btnPrimary">
              Submit Return Request
            </button>
            <button onClick={() => setShowReturn(false)} className="btn btnGhost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* REFUND REQUEST SECTION */}
      {showRefund && (
        <div className="card" style={{ background: "#dcfce7" }}>
          <h3 style={{ fontWeight: 900, marginBottom: 12 }}>Request Refund</h3>
          <input
            type="number"
            placeholder={`Full amount: ${fmtM(order.total_amount)}`}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, marginBottom: 12 }}
          />
          <textarea
            placeholder="Reason for refund..."
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, minHeight: 80 }}
          />
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={handleRequestRefund} className="btn btnPrimary">
              Submit Refund Request
            </button>
            <button onClick={() => setShowRefund(false)} className="btn btnGhost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TRACKING INFO */}
      {tracking && (
        <div className="card" style={{ background: "#e0e7ff" }}>
          <h3 style={{ fontWeight: 900, marginBottom: 12 }}>📦 Tracking Information</h3>
          <p><strong>Carrier:</strong> {tracking.carrier || "N/A"}</p>
          <p><strong>Tracking Number:</strong> {tracking.tracking_number || order.tracking_number}</p>
          <p><strong>Status:</strong> {tracking.status || order.shipping_status}</p>
          {tracking.estimated_delivery && (
            <p><strong>Estimated Delivery:</strong> {new Date(tracking.estimated_delivery).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {/* ORDER SUMMARY */}
      <div className="card">
        <div style={{ opacity: 0.6 }}>Order Total</div>
        <div style={{ fontSize: 36, fontWeight: 900 }}>
          {fmtM(order.total_amount)}
        </div>

        <div style={{ marginTop: 16 }}>
          <strong>Status:</strong> {order.status}
        </div>

        {order.refund_status && order.refund_status !== "none" && (
          <div style={{ marginTop: 8 }}>
            <strong>Refund Status:</strong> {order.refund_status}
            {order.refund_amount && ` - ${fmtM(order.refund_amount)}`}
          </div>
        )}

        {order.return_status && order.return_status !== "none" && (
          <div style={{ marginTop: 8 }}>
            <strong>Return Status:</strong> {order.return_status}
          </div>
        )}
      </div>

      {/* PAYMENT SECTION – only show when order is still pending */}
      {isOrderPending && (
        <div className="card" style={{ display: "grid", gap: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>
            Complete Your Payment
          </h2>

          {bankDetails && (
            <div
              style={{
                padding: 20,
                borderRadius: 16,
                background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                border: "1px solid #86efac",
                display: "grid",
                gap: 8,
              }}
            >
              <div><strong>Bank:</strong> {bankDetails.bank_name}</div>
              <div><strong>Account Name:</strong> {bankDetails.account_name}</div>
              <div><strong>Account Number:</strong> {bankDetails.account_number}</div>

              {bankDetails.qr_code_url && (
                <img
                  src={bankDetails.qr_code_url}
                  alt="QR Code"
                  style={{ maxWidth: 200, marginTop: 12 }}
                />
              )}

              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 10,
                  background: "#fffbeb",
                }}
              >
                📝 Use reference:
                <strong> {order.id.slice(0, 8)}</strong>
              </div>

              <div style={{ fontSize: 14, opacity: 0.8 }}>
                📸 After transfer, upload:
                <ul>
                  <li>Screenshot of bank transfer</li>
                  <li>Photo of payment receipt</li>
                  <li>Mobile banking confirmation</li>
                </ul>
              </div>
            </div>
          )}

          {canCreatePayment && (
            <button
              className="btn btnPrimary"
              onClick={handleCreatePayment}
              disabled={creatingPayment}
            >
              {creatingPayment ? "Creating..." : "Confirm Transfer"}
            </button>
          )}

          {canUploadProof && (
            <div style={{ display: "grid", gap: 12 }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading && <div>Uploading…</div>}
            </div>
          )}
        </div>
      )}

      {/* PAYMENT STATUS BANNERS */}
      {isOnHold && (
        <div className="card" style={{ background: "#fef3c7" }}>
          ⏳ Payment submitted. Awaiting verification.
        </div>
      )}

      {isOrderPaid && (
        <div className="card" style={{ background: "#dcfce7" }}>
          ✅ Payment confirmed. Preparing shipment.
        </div>
      )}

      {isRejected && (
        <div className="card" style={{ background: "#fee2e2" }}>
          ❌ Payment rejected. Please contact support.
        </div>
      )}

      {isCancelled && (
        <div className="card" style={{ background: "#f3f4f6" }}>
          ❌ This order has been cancelled.
        </div>
      )}

      {/* ORDER ITEMS */}
      {order.items && order.items.length > 0 && (
        <div className="card">
          <h3 style={{ fontWeight: 900, marginBottom: 16 }}>Order Items</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {order.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 12,
                  borderRadius: 8,
                  background: "#f9fafb",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>
                    Qty: {item.quantity} × {fmtM(item.price)}
                  </div>
                </div>
                <div style={{ fontWeight: 900 }}>{fmtM(item.subtotal)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}