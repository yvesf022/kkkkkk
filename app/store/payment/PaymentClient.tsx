"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

import { paymentsApi } from "@/lib/api";
import type { BankSettings, Payment } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const WHATSAPP_NUMBER = "919253258848";

export default function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");

  const [payment, setPayment] = useState<Payment | null>(null);
  const [bankDetails, setBankDetails] = useState<BankSettings | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [retrying, setRetrying] = useState(false);

  /* ─── Load bank details (always needed) ─── */
  useEffect(() => {
    paymentsApi.getBankDetails()
      .then((b) => setBankDetails(b as BankSettings))
      .catch(() => {}); // non-fatal
  }, []);

  /* ─── Init payment ───────────────────────────────────────────
     Strategy:
     1. Try to create a new payment for the order.
     2. If the API returns 400/409 (payment already exists),
        fall back to fetching the existing one from /api/payments/my
        or from the order detail.
     3. Show the payment in whatever state it's in.
  ──────────────────────────────────────────────────────────── */
  const initPayment = useCallback(async () => {
    if (!orderId) return;
    setInitializing(true);
    setInitError(null);

    let resolvedPayment: Payment | null = null;

    try {
      // Attempt to create payment
      resolvedPayment = await paymentsApi.create(orderId) as Payment;
    } catch (createErr: any) {
      // Payment already exists — try to find it in My Payments
      try {
        const myPayments = await paymentsApi.getMy() as any;
        const list: Payment[] = Array.isArray(myPayments)
          ? myPayments
          : myPayments?.results ?? myPayments?.payments ?? [];
        resolvedPayment = list.find((p) => p.order_id === orderId) ?? null;
      } catch {
        // Last resort: surface the original create error
        setInitError(createErr?.message ?? "Could not initialize payment.");
      }
    }

    if (resolvedPayment) {
      setPayment(resolvedPayment);
      if (resolvedPayment.proof?.file_url) setUploaded(true);

      // Load status history
      try {
        const h = await paymentsApi.getStatusHistory(resolvedPayment.id) as any;
        setStatusHistory(Array.isArray(h) ? h : h?.history ?? []);
      } catch {}
    }

    setInitializing(false);
  }, [orderId]);

  useEffect(() => { initPayment(); }, [initPayment]);

  /* ─── Upload proof ─── */
  async function handleUpload() {
    if (!file || !payment?.id) return;
    setUploading(true);
    try {
      if (uploaded) {
        await paymentsApi.resubmitProof(payment.id, file);
        toast.success("Proof resubmitted!");
      } else {
        await paymentsApi.uploadProof(payment.id, file);
        toast.success("Payment proof uploaded!");
        setUploaded(true);
      }
      setFile(null);
      // Refresh payment state
      const updated = await paymentsApi.getById(payment.id) as Payment;
      setPayment(updated);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  /* ─── Cancel payment ─── */
  async function handleCancel() {
    if (!payment?.id || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await paymentsApi.cancel(payment.id, cancelReason);
      toast.success("Payment cancelled.");
      router.push("/account/orders");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to cancel payment");
    } finally {
      setCancelling(false);
    }
  }

  /* ─── Retry ─── */
  async function handleRetry() {
    if (!orderId) return;
    setRetrying(true);
    try {
      const p = await paymentsApi.retry(orderId) as Payment;
      setPayment(p);
      setUploaded(false);
      setStatusHistory([]);
      toast.success("New payment initialized!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to retry payment");
    } finally {
      setRetrying(false);
    }
  }

  /* ─── Guards ─── */
  if (!orderId) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Invalid payment link</div>
        <Link href="/account/orders" style={linkBtn}>Go to Orders</Link>
      </div>
    );
  }

  const whatsappMsg = encodeURIComponent(`Hello, I have completed payment for Order ${orderId}. Please verify.`);
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`;

  const statusColor: Record<string, [string, string]> = {
    pending:  ["#fef9c3", "#854d0e"],
    on_hold:  ["#fef3c7", "#92400e"],
    paid:     ["#dcfce7", "#166534"],
    rejected: ["#fee2e2", "#991b1b"],
  };
  const [statusBg, statusText] = statusColor[payment?.status ?? "pending"] ?? ["#f1f5f9", "#475569"];

  return (
    <div style={{ background: "linear-gradient(160deg, #f0f4ff, #f8fafc)", minHeight: "100vh", padding: "80px 20px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ width: 72, height: 72, margin: "0 auto 20px", borderRadius: "50%", background: "#0f172a", color: "#fff", display: "grid", placeItems: "center", fontSize: 28 }}>
            💳
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, color: "#0f172a" }}>Complete Your Payment</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Order: <strong>#{orderId?.slice(0, 8).toUpperCase()}</strong>
            {payment?.amount != null && <> · <strong>{formatCurrency(payment.amount)}</strong></>}
          </p>

          {payment && (
            <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 99, background: statusBg, color: statusText, fontWeight: 700, fontSize: 13 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusText }} />
              Payment {payment.status.replace("_", " ")}
            </div>
          )}

          {initializing && (
            <p style={{ marginTop: 16, fontSize: 13, color: "#94a3b8" }}>Initializing payment…</p>
          )}

          {initError && !initializing && (
            <div style={{ marginTop: 16, padding: "12px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, fontSize: 14, color: "#991b1b" }}>
              {initError}
              <button onClick={initPayment} style={{ marginLeft: 12, fontWeight: 700, background: "none", border: "none", cursor: "pointer", color: "#dc2626", textDecoration: "underline" }}>
                Retry
              </button>
            </div>
          )}
        </div>

        {/* ─── Rejected — retry ─── */}
        {payment?.status === "rejected" && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 16, padding: 24, marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>❌</div>
            <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 12 }}>Payment was rejected</div>
            {payment?.admin_notes && (
              <p style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 16 }}>Admin note: {payment.admin_notes}</p>
            )}
            <button onClick={handleRetry} disabled={retrying} style={primaryBtn}>
              {retrying ? "Creating new payment…" : "Retry Payment"}
            </button>
          </div>
        )}

        {/* ─── Paid — success ─── */}
        {payment?.status === "paid" && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: 40, textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#166534", marginBottom: 8 }}>Payment Confirmed!</h2>
            <p style={{ color: "#166534", fontSize: 15, marginBottom: 24 }}>
              Your payment of {formatCurrency(payment.amount)} has been verified.
            </p>
            <Link href="/account/orders" style={{ ...linkBtn, display: "inline-block" }}>
              View My Orders
            </Link>
          </div>
        )}

        {/* ─── Pending / On Hold — show steps ─── */}
        {(payment?.status === "pending" || payment?.status === "on_hold" || !payment) && !initializing && !initError && (
          <>
            {/* STEP 1: Bank details */}
            <div style={stepCard}>
              <StepHeader number="1" title="Transfer Payment to Our Account" />
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16 }}>
                {bankDetails ? (
                  <>
                    {bankDetails.bank_name && <BankRow label="Bank" value={bankDetails.bank_name} />}
                    {bankDetails.account_name && <BankRow label="Account Name" value={bankDetails.account_name} />}
                    {bankDetails.account_number && <BankRow label="Account Number" value={bankDetails.account_number} copyable />}
                    {bankDetails.branch && <BankRow label="Branch" value={bankDetails.branch} />}
                    {bankDetails.swift_code && <BankRow label="Swift Code" value={bankDetails.swift_code} copyable />}
                    {bankDetails.mobile_money_number && (
                      <>
                        <BankRow label={bankDetails.mobile_money_provider ?? "Mobile Money"} value={bankDetails.mobile_money_number} copyable />
                        {bankDetails.mobile_money_name && <BankRow label="Name" value={bankDetails.mobile_money_name} />}
                      </>
                    )}
                    <BankRow label="Reference / Order" value={orderId ?? ""} copyable />
                    {bankDetails.instructions && (
                      <div style={{ marginTop: 12, fontSize: 13, color: "#475569", lineHeight: 1.6, padding: "10px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                        ℹ️ {bankDetails.instructions}
                      </div>
                    )}
                  </>
                ) : (
                  /* Fallback static details while loading */
                  <>
                    <BankRow label="Bank" value="Standard Lesotho Bank" />
                    <BankRow label="Account Name" value="Karabo Online Store" />
                    <BankRow label="Account Number" value="123456789" copyable />
                    <BankRow label="Reference" value={orderId ?? ""} copyable />
                  </>
                )}
              </div>
            </div>

            {/* STEP 2: Upload proof */}
            <div style={stepCard}>
              <StepHeader number="2" title={uploaded ? "Resubmit Payment Proof" : "Upload Payment Proof"} />

              {payment?.status === "on_hold" && (
                <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#713f12" }}>
                  ⏳ Your proof is under review. You may resubmit if needed.
                </div>
              )}

              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

                {/* What is payment proof — clear explainer */}
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e40af", marginBottom: 8 }}>
                    📋 What is Payment Proof?
                  </div>
                  <div style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 1.7 }}>
                    Upload <strong>any one</strong> of the following:
                  </div>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "#1e3a8a", lineHeight: 1.9 }}>
                    <li><strong>Bank transfer screenshot</strong> — from your internet/mobile banking app showing the transfer was sent</li>
                    <li><strong>Bank slip / deposit slip</strong> — the paper or digital receipt you received at the bank</li>
                    <li><strong>SMS confirmation</strong> — the text message your bank sent confirming the payment</li>
                  </ul>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#3b82f6" }}>
                    ✅ Make sure the <strong>amount</strong> and <strong>reference number (#{orderId?.slice(0, 8).toUpperCase()})</strong> are clearly visible.
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                    id="proof-upload"
                  />
                  <label
                    htmlFor="proof-upload"
                    style={{ display: "block", padding: "14px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#475569" }}
                  >
                    {file ? `📎 ${file.name}` : "📁 Choose File  (photo, screenshot or PDF)"}
                  </label>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!payment?.id || !file || uploading}
                  style={{ ...primaryBtn, opacity: (!payment?.id || !file) ? 0.5 : 1 }}
                >
                  {uploading ? "Uploading…" : uploaded ? "Resubmit Proof" : "Upload Payment Proof"}
                </button>

                {uploaded && !file && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#166534", fontSize: 13, fontWeight: 600 }}>
                    ✅ Proof submitted — awaiting admin verification
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: WhatsApp */}
            <div style={{ ...stepCard, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <StepHeader number="3" title="Notify Us on WhatsApp" />
              <p style={{ fontSize: 13, color: "#166534", marginBottom: 16, lineHeight: 1.6 }}>
                After uploading your proof, send us a WhatsApp message so we can verify faster.
              </p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: 14, background: "#25D366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15 }}
              >
                <span style={{ fontSize: 20 }}>📱</span> Open WhatsApp
              </a>
            </div>

            {/* Cancel payment */}
            <div style={{ ...stepCard, borderColor: "#fee2e2" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#7f1d1d" }}>Cancel Payment</div>
              {!showCancelForm ? (
                <button onClick={() => setShowCancelForm(true)} style={{ ...outlineBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  Cancel this payment
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    style={inputSt}
                    placeholder="Reason for cancellation…"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleCancel} disabled={cancelling || !cancelReason.trim()} style={{ ...primaryBtn, background: "#dc2626", opacity: !cancelReason.trim() ? 0.5 : 1 }}>
                      {cancelling ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                    <button onClick={() => setShowCancelForm(false)} style={outlineBtn}>Back</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Status history */}
        {statusHistory.length > 0 && (
          <div style={stepCard}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Payment Timeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {statusHistory.map((h: any, i: number) => {
                const [bg, col] = statusColor[h.status] ?? ["#f1f5f9", "#475569"];
                return (
                  <div key={h.id ?? i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: col, marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, background: bg, color: col, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                        {h.status}
                      </div>
                      {h.reason && <div style={{ fontSize: 12, color: "#64748b" }}>{h.reason}</div>}
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/account/orders" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
            ← Back to My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function StepHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0f172a", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
        {number}
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#0f172a" }}>{title}</h2>
    </div>
  );
}

function BankRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  function copy() {
    navigator.clipboard.writeText(value).then(() => toast.success("Copied!")).catch(() => {});
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{value}</span>
        {copyable && (
          <button onClick={copy} style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", color: "#475569", fontWeight: 600 }}>
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */
const stepCard: React.CSSProperties = { background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 28, marginBottom: 20 };
const primaryBtn: React.CSSProperties = { padding: "13px 24px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const outlineBtn: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#475569" };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" };
const linkBtn: React.CSSProperties = { padding: "12px 28px", borderRadius: 12, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 };