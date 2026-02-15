"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { getMyOrders, paymentsApi } from "@/lib/api";
import type { Order } from "@/lib/types";

/* ======================
   FORMAT
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

      setOrder(found);
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
      toast.success("Payment created. Follow instructions below.");
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
  const isPaid = order.status === "paid";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="pageContentWrap" style={{ maxWidth: 1000 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          {new Date(order.created_at).toLocaleDateString("en-ZA")}
        </p>
      </div>

      {/* TOTAL CARD */}
      <div
        style={{
          padding: 40,
          borderRadius: 24,
          background:
            "linear-gradient(135deg,#0F2027,#203A43,#2C5364)",
          color: "white",
          marginBottom: 40,
        }}
      >
        <div style={{ opacity: 0.8 }}>Amount To Pay</div>
        <div style={{ fontSize: 48, fontWeight: 900 }}>
          {fmtM(order.total_amount)}
        </div>
      </div>

      {/* PAYMENT FLOW */}
      {isPending && (
        <div
          style={{
            padding: 30,
            borderRadius: 24,
            background: "white",
            boxShadow:
              "0 20px 60px rgba(15,23,42,0.12)",
            display: "grid",
            gap: 24,
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>
            Payment Instructions
          </h2>

          {/* STEP 1 */}
          {bankDetails && (
            <div>
              <h3 style={{ fontWeight: 800 }}>
                Step 1 — Transfer Payment
              </h3>

              <div
                style={{
                  marginTop: 12,
                  padding: 20,
                  borderRadius: 18,
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                }}
              >
                <div><strong>Bank:</strong> {bankDetails.bank_name}</div>
                <div><strong>Account Name:</strong> {bankDetails.account_name}</div>
                <div>
                  <strong>Account Number:</strong>{" "}
                  {bankDetails.account_number}
                </div>
                <div>
                  <strong>Reference:</strong>{" "}
                  {order.id.slice(0, 8)}
                </div>

                {bankDetails.instructions && (
                  <div
                    style={{
                      marginTop: 12,
                      fontStyle: "italic",
                      opacity: 0.8,
                    }}
                  >
                    {bankDetails.instructions}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {!paymentId && (
            <button
              className="btn btnPrimary"
              onClick={handleCreatePayment}
              disabled={creatingPayment}
            >
              {creatingPayment
                ? "Preparing payment..."
                : "Confirm Transfer & Upload Proof"}
            </button>
          )}

          {/* STEP 3 */}
          {paymentId && (
            <div>
              <h3 style={{ fontWeight: 800 }}>
                Step 2 — Upload Proof
              </h3>

              <div
                style={{
                  marginTop: 12,
                  padding: 24,
                  borderRadius: 18,
                  border: "2px dashed #cbd5e1",
                  textAlign: "center",
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                />

                {uploading && (
                  <div style={{ marginTop: 10 }}>
                    Uploading…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isPaid && (
        <div
          style={{
            padding: 24,
            borderRadius: 20,
            background: "#dcfce7",
            color: "#166534",
            fontWeight: 700,
          }}
        >
          ✓ Payment approved. Preparing shipment.
        </div>
      )}

      {isCancelled && (
        <div
          style={{
            padding: 24,
            borderRadius: 20,
            background: "#fee2e2",
            color: "#991b1b",
            fontWeight: 700,
          }}
        >
          ❌ Order cancelled.
        </div>
      )}

      {/* FOOTER */}
      <div style={{ marginTop: 40 }}>
        <button
          className="btn btnGhost"
          onClick={() =>
            router.push("/account/orders")
          }
        >
          ← Back to Orders
        </button>
      </div>
    </div>
  );
}
