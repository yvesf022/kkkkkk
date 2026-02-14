"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { getMyOrders, paymentsApi } from "@/lib/api";
import type { Order } from "@/lib/types";

/* ======================
   MALOTI FORMAT
====================== */

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
      const orders: any[] = await getMyOrders();
      const found = orders.find((o) => o.id === id);
      if (!found) throw new Error();

      setOrder({
        id: found.id,
        created_at: found.created_at,
        total_amount: found.total_amount,
        status: found.status,
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
      toast.success("Payment created. Upload proof below.");
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment");
    } finally {
      setCreatingPayment(false);
    }
  }

  /* ======================
     UPLOAD PROOF
  ====================== */

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || !paymentId) return;

    if (
      !file.type.startsWith("image/") &&
      file.type !== "application/pdf"
    ) {
      toast.error("Only images and PDFs allowed");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15MB");
      return;
    }

    setUploading(true);

    try {
      await paymentsApi.uploadProof(paymentId, file);
      toast.success("Payment proof uploaded");
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

  if (authLoading)
    return <div className="pageContentWrap">Loading…</div>;

  if (!user) return null;

  if (loading || !order)
    return (
      <div className="pageContentWrap">
        Loading order…
      </div>
    );

  const isPending = order.status === "pending";
  const isOnHold = order.status === "on_hold";
  const isPaid = order.status === "paid";
  const isRejected = order.status === "rejected";

  const canCreatePayment = isPending && !paymentId;
  const canUploadProof = isPending && paymentId;

  return (
    <div className="pageContentWrap" style={{ maxWidth: 1100 }}>
      {/* BREADCRUMB */}
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>
        <Link href="/account/orders">Orders</Link> ›{" "}
        <strong>Order #{order.id.slice(0, 8)}</strong>
      </div>

      {/* HEADER */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          Placed{" "}
          {new Date(order.created_at).toLocaleDateString(
            "en-ZA"
          )}
        </p>
      </header>

      {/* SUMMARY */}
      <div
        style={{
          padding: 28,
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
          marginBottom: 28,
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          Order Total
        </div>
        <div style={{ fontSize: 36, fontWeight: 900 }}>
          {fmtM(order.total_amount)}
        </div>
      </div>

      {/* PAYMENT SECTION */}
      <div
        style={{
          padding: 28,
          borderRadius: 22,
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          marginBottom: 28,
          display: "grid",
          gap: 20,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 900 }}>
          Payment
        </h2>

        {/* BANK DETAILS */}
        {bankDetails && isPending && (
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: "#f0fdf4",
              border: "2px solid #86efac",
            }}
          >
            <h3
              style={{
                fontWeight: 900,
                marginBottom: 12,
              }}
            >
              Bank Details
            </h3>

            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <strong>Bank:</strong>{" "}
                {bankDetails.bank_name}
              </div>
              <div>
                <strong>Account Name:</strong>{" "}
                {bankDetails.account_name}
              </div>
              <div>
                <strong>Account Number:</strong>{" "}
                {bankDetails.account_number}
              </div>

              {bankDetails.instructions && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    background: "#fffbeb",
                    borderRadius: 8,
                    fontStyle: "italic",
                  }}
                >
                  📝 {bankDetails.instructions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE PAYMENT */}
        {canCreatePayment && (
          <button
            className="btn btnPrimary"
            onClick={handleCreatePayment}
            disabled={creatingPayment}
          >
            {creatingPayment
              ? "Creating payment…"
              : "Create Payment"}
          </button>
        )}

        {/* UPLOAD PROOF */}
        {canUploadProof && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading && (
              <p style={{ fontSize: 13, opacity: 0.6 }}>
                Uploading…
              </p>
            )}
          </div>
        )}

        {/* ON HOLD */}
        {isOnHold && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#fef3c7",
              color: "#92400e",
            }}
          >
            ⏳ Payment submitted. Awaiting admin review.
          </div>
        )}

        {/* PAID */}
        {isPaid && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#dcfce7",
              color: "#166534",
            }}
          >
            ✓ Payment approved. Preparing for shipment.
          </div>
        )}

        {/* REJECTED */}
        {isRejected && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            ❌ Payment rejected. Please contact support.
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn btnGhost"
          onClick={() =>
            router.push("/account/orders")
          }
        >
          ← Back
        </button>

        <button
          className="btn btnPrimary"
          onClick={() => router.push("/store")}
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}
