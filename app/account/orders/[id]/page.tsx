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
      // ✅ FIXED: use getById directly instead of fetching all orders and scanning
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
     STATES
  ====================== */

  if (authLoading) return <div className="pageContentWrap">Loading…</div>;
  if (!user) return null;
  if (loading || !order)
    return <div className="pageContentWrap">Loading order…</div>;

  // ✅ FIXED: order.status only has OrderStatus values (pending/paid/cancelled/shipped/completed)
  const isOrderPending = order.status === "pending";
  const isOrderPaid    = order.status === "paid";

  // ✅ FIXED: on_hold and rejected live on payment_status, not order.status
  const paymentStatus  = order.payment_status;
  const isOnHold       = paymentStatus === "on_hold";
  const isRejected     = paymentStatus === "rejected";

  const canCreatePayment = isOrderPending && !paymentId;
  const canUploadProof   = isOrderPending && !!paymentId && !isOnHold;

  return (
    <div className="pageContentWrap" style={{ maxWidth: 1000 }}>

      {/* HEADER */}
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        Order #{order.id.slice(0, 8)}
      </h1>

      {/* ORDER SUMMARY */}
      <div className="card">
        <div style={{ opacity: 0.6 }}>Order Total</div>
        <div style={{ fontSize: 36, fontWeight: 900 }}>
          {fmtM(order.total_amount)}
        </div>
      </div>

      {/* PAYMENT SECTION — only show when order is still pending */}
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
                🔔 Use reference:
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
    </div>
  );
}