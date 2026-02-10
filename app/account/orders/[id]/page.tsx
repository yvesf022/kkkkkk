"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { getMyOrders, paymentsApi } from "@/lib/api";
import type { Order, PaymentStatus, ShippingStatus } from "@/lib/types";

/** Currency formatter */
const fmt = (v: number) => `R ${Math.round(v).toLocaleString()}`;

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

  /* ============ AUTH REDIRECT ============ */
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [authLoading, user, router]);

  /* ============ LOAD ORDER ============ */
  async function loadOrder() {
    try {
      // ✅ FIX: Backend doesn't have GET /api/orders/:id
      // So we fetch all orders and filter client-side
      const orders: any[] = await getMyOrders();
      const found = orders.find((o) => o.id === id);

      if (!found) {
        throw new Error("Order not found");
      }

      setOrder({
        id: found.id,
        created_at: found.created_at,
        total_amount: found.total_amount,
        status: found.status, // ✅ FIXED: was order_status
        shipping_status: found.shipping_status,
        tracking_number: found.tracking_number ?? null,
      });
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

  /* ============ CREATE PAYMENT ============ */
  async function handleCreatePayment() {
    if (!order) return;

    setCreatingPayment(true);

    try {
      // ✅ CORRECT: POST /api/payments/${orderId}
      const result: any = await paymentsApi.create(order.id);
      setPaymentId(result.payment_id);
      toast.success("Payment created. You can now upload proof.");
      await loadOrder();
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment");
    } finally {
      setCreatingPayment(false);
    }
  }

  /* ============ UPLOAD PAYMENT PROOF ============ */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !paymentId) return;

    // Validation
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Only images and PDFs are allowed");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15MB");
      return;
    }

    setUploading(true);

    try {
      // ✅ CORRECT: POST /api/payments/${paymentId}/proof
      await paymentsApi.uploadProof(paymentId, file);
      
      toast.success("Payment proof uploaded successfully");
      if (fileRef.current) fileRef.current.value = "";
      await loadOrder();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  /* ============ RENDER STATES ============ */
  if (authLoading) {
    return (
      <div className="pageContentWrap">
        <p style={{ opacity: 0.6 }}>Loading your account…</p>
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="pageContentWrap">
        <div style={{ 
          height: 400, 
          borderRadius: 22, 
          background: "#f8fafc",
          display: "grid",
          placeItems: "center"
        }}>
          <p style={{ opacity: 0.6 }}>Loading order…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pageContentWrap">
        <p style={{ opacity: 0.6 }}>Order not found.</p>
      </div>
    );
  }

  const canCreatePayment = order.status === "pending" && !paymentId;
  const canUploadProof = paymentId && order.status === "pending";

  return (
    <div className="pageContentWrap" style={{ maxWidth: 1100 }}>
      {/* BREADCRUMB */}
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>
        <Link href="/account/orders" style={{ color: "inherit" }}>
          Orders
        </Link>{" "}
        › <strong>Order #{order.id.slice(0, 8)}</strong>
      </div>

      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          Placed on {new Date(order.created_at).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {/* ORDER SUMMARY CARD */}
      <div
        style={{
          padding: 28,
          borderRadius: 22,
          background: "linear-gradient(135deg, #ffffff, #f8fbff)",
          boxShadow: "0 20px 60px rgba(15,23,42,0.14)",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          {/* Amount */}
          <div>
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>
              Order Total
            </div>
            <div style={{ fontSize: 36, fontWeight: 900 }}>
              {fmt(order.total_amount)}
            </div>
          </div>

          {/* Status Badges */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                padding: "8px 16px",
                borderRadius: 999,
                background: getStatusColor(order.status).bg,
                color: getStatusColor(order.status).text,
              }}
            >
              {formatStatus(order.status)}
            </span>

            {order.shipping_status && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: getShippingColor(order.shipping_status).bg,
                  color: getShippingColor(order.shipping_status).text,
                }}
              >
                Shipping: {formatStatus(order.shipping_status)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PAYMENT SECTION */}
      <div
        style={{
          padding: 28,
          borderRadius: 22,
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          marginBottom: 28,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>
          Payment
        </h2>

        {/* CREATE PAYMENT */}
        {canCreatePayment && (
          <div>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
              Create a payment for this order to upload your payment proof.
            </p>
            <button
              className="btn btnPrimary"
              onClick={handleCreatePayment}
              disabled={creatingPayment}
            >
              {creatingPayment ? "Creating payment…" : "Create Payment"}
            </button>
          </div>
        )}

        {/* UPLOAD PROOF */}
        {canUploadProof && (
          <div>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
              Upload proof of payment (image or PDF, max 15MB)
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUpload}
              disabled={uploading}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "2px dashed rgba(15,23,42,0.2)",
                background: "#f8fafc",
                cursor: "pointer",
                width: "100%",
              }}
            />

            {uploading && (
              <p style={{ marginTop: 12, fontSize: 13, opacity: 0.6 }}>
                Uploading…
              </p>
            )}
          </div>
        )}

        {/* PAYMENT SUBMITTED */}
        {!canCreatePayment && !canUploadProof && order.status === "pending" && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#fef3c7",
              color: "#92400e",
            }}
          >
            <strong>Payment proof submitted.</strong>
            <p style={{ marginTop: 6, fontSize: 14 }}>
              Our team is reviewing your payment. You'll be notified once it's verified.
            </p>
          </div>
        )}

        {/* PAYMENT APPROVED */}
        {order.status === "paid" && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#dcfce7",
              color: "#166534",
            }}
          >
            <strong>✓ Payment verified</strong>
            <p style={{ marginTop: 6, fontSize: 14 }}>
              Your payment has been confirmed. Your order is being prepared for shipping.
            </p>
          </div>
        )}

        {/* ORDER CANCELLED */}
        {order.status === "cancelled" && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            <strong>Order cancelled</strong>
            <p style={{ marginTop: 6, fontSize: 14 }}>
              This order has been cancelled.
            </p>
          </div>
        )}
      </div>

      {/* TRACKING */}
      {order.tracking_number && (
        <div
          style={{
            padding: 20,
            borderRadius: 18,
            background: "#dbeafe",
            color: "#1e40af",
            marginBottom: 28,
          }}
        >
          <strong>Tracking Number:</strong> {order.tracking_number}
        </div>
      )}

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btnGhost"
          onClick={() => router.push("/account/orders")}
        >
          ← Back to orders
        </button>

        <button className="btn btnPrimary" onClick={() => router.push("/store")}>
          Continue shopping
        </button>
      </div>
    </div>
  );
}

/* ============ HELPERS ============ */

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "pending":
      return { bg: "#fef3c7", text: "#92400e" };
    case "paid":
      return { bg: "#dcfce7", text: "#166534" };
    case "cancelled":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "shipped":
      return { bg: "#dbeafe", text: "#1e40af" };
    case "completed":
      return { bg: "#dcfce7", text: "#166534" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
}

function getShippingColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "pending":
      return { bg: "#fef3c7", text: "#92400e" };
    case "processing":
      return { bg: "#dbeafe", text: "#1e40af" };
    case "shipped":
      return { bg: "#e0e7ff", text: "#3730a3" };
    case "delivered":
      return { bg: "#dcfce7", text: "#166534" };
    case "returned":
      return { bg: "#fee2e2", text: "#991b1b" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
}
