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

  /* 1 = initializing, 2 = transfer+upload, 3 = done */
  const [uiStep, setUiStep] = useState<1 | 2 | 3>(1);

  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    paymentsApi.getBankDetails()
      .then((b) => setBankDetails(b as BankSettings))
      .catch(() => {});
  }, []);

  const initPayment = useCallback(async () => {
    if (!orderId) return;
    setInitializing(true);
    setInitError(null);

    let resolvedPayment: Payment | null = null;

    try {
      resolvedPayment = await paymentsApi.create(orderId) as Payment;
    } catch (createErr: any) {
      try {
        const myPayments = await paymentsApi.getMy() as any;
        const list: Payment[] = Array.isArray(myPayments)
          ? myPayments
          : myPayments?.results ?? myPayments?.payments ?? [];
        resolvedPayment = list.find((p) => p.order_id === orderId) ?? null;

        if (!resolvedPayment) {
          try {
            const byOrder = await (paymentsApi as any).getByOrderId?.(orderId) as Payment;
            if (byOrder?.id) resolvedPayment = byOrder;
          } catch {}
        }
      } catch {
        setInitError(createErr?.message ?? "Could not initialize payment. Please retry.");
        setInitializing(false);
        return;
      }

      if (!resolvedPayment) {
        setInitError(createErr?.message ?? "Could not load your payment. Please retry.");
        setInitializing(false);
        return;
      }
    }

    if (resolvedPayment) {
      setPayment(resolvedPayment);
      if (resolvedPayment.proof?.file_url) setUploaded(true);
      try {
        const h = await paymentsApi.getStatusHistory(resolvedPayment.id) as any;
        setStatusHistory(Array.isArray(h) ? h : h?.history ?? []);
      } catch {}
      setUiStep(resolvedPayment.status === "paid" ? 3 : 2);
    }

    setInitializing(false);
  }, [orderId]);

  useEffect(() => { initPayment(); }, [initPayment]);

  async function handleUpload() {
    if (!file) { toast.error("Please select a file first"); return; }
    if (!payment?.id) { toast.error("Payment session not confirmed — tap Retry Init below"); return; }
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
      const updated = await paymentsApi.getById(payment.id) as Payment;
      setPayment(updated);
      setUiStep(3);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

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

  async function handleRetry() {
    if (!orderId) return;
    setRetrying(true);
    try {
      const p = await paymentsApi.retry(orderId) as Payment;
      setPayment(p);
      setUploaded(false);
      setStatusHistory([]);
      setUiStep(2);
      toast.success("New payment initialized!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to retry payment");
    } finally {
      setRetrying(false);
    }
  }

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
  const [statusBg, statusFg] = statusColor[payment?.status ?? "pending"] ?? ["#f1f5f9", "#475569"];

  return (
    <div style={{ background: "linear-gradient(160deg,#f0f4ff,#f8fafc)", minHeight: "100vh", padding: "60px 20px 80px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, margin: "0 auto 14px", borderRadius: "50%", background: "#0f172a", color: "#fff", display: "grid", placeItems: "center", fontSize: 26 }}>
            💳
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 6px", color: "#0f172a" }}>Complete Your Payment</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            Order <strong>#{orderId?.slice(0, 8).toUpperCase()}</strong>
            {payment?.amount != null && <> · <strong>{formatCurrency(payment.amount)}</strong></>}
          </p>
          {payment && (
            <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, background: statusBg, color: statusFg, fontWeight: 700, fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusFg, flexShrink: 0 }} />
              Payment {payment.status.replace("_", " ")}
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
          {[{ n: 1, label: "Initialize" }, { n: 2, label: "Pay & Upload" }, { n: 3, label: "Done" }].map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center",
                  fontWeight: 900, fontSize: 13,
                  background: uiStep > s.n ? "#166534" : uiStep === s.n ? "#0f172a" : "#e2e8f0",
                  color: uiStep >= s.n ? "#fff" : "#94a3b8",
                  transition: "all 0.3s",
                }}>
                  {uiStep > s.n ? "✓" : s.n}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: uiStep === s.n ? "#0f172a" : "#94a3b8", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: 56, height: 2, background: uiStep > s.n ? "#166534" : "#e2e8f0", margin: "0 4px 18px", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Initializing ── */}
        {uiStep === 1 && (
          <div style={{ ...stepCard, textAlign: "center", padding: 48 }}>
            {initializing ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 14 }}>⏳</div>
                <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginBottom: 6 }}>Setting up your payment…</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>This only takes a moment</div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : initError ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 14 }}>❌</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#991b1b", marginBottom: 8 }}>Could not initialize payment</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>{initError}</div>
                <button onClick={initPayment} style={primaryBtn}>🔄 Try Again</button>
                <div style={{ marginTop: 16 }}>
                  <Link href="/account/orders" style={{ fontSize: 13, color: "#64748b" }}>← Back to Orders</Link>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── STEP 2: Transfer + Upload ── */}
        {uiStep === 2 && (
          <>
            {payment?.status === "rejected" && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 16, padding: 24, marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
                <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Payment was rejected</div>
                {payment?.admin_notes && <p style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 16 }}>Reason: {payment.admin_notes}</p>}
                <button onClick={handleRetry} disabled={retrying} style={primaryBtn}>
                  {retrying ? "Creating new payment…" : "Retry Payment"}
                </button>
              </div>
            )}

            {/* Bank details */}
            <div style={stepCard}>
              <SectionHeader icon="🏦" title="Transfer Payment to Our Account" subtitle="Use your banking app, ATM, or visit a branch" />
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
                  <>
                    <BankRow label="Bank" value="Standard Lesotho Bank" />
                    <BankRow label="Account Name" value="Karabo Online Store" />
                    <BankRow label="Account Number" value="123456789" copyable />
                    <BankRow label="Reference" value={orderId ?? ""} copyable />
                  </>
                )}
              </div>
            </div>

            {/* Upload proof */}
            <div style={stepCard}>
              <SectionHeader
                icon="📎"
                title={uploaded ? "Resubmit Payment Proof" : "Upload Payment Proof"}
                subtitle="Screenshot, bank slip, or SMS confirmation of your transfer"
              />

              {payment?.status === "on_hold" && (
                <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#713f12" }}>
                  ⏳ Your proof is under review. You may resubmit if needed.
                </div>
              )}

              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1e40af", marginBottom: 6 }}>📋 What counts as proof?</div>
                <div style={{ fontSize: 12, color: "#1e3a8a", lineHeight: 1.9 }}>
                  • <strong>Bank app screenshot</strong> showing the transfer was sent<br />
                  • <strong>Bank slip / deposit slip</strong> from teller or ATM<br />
                  • <strong>SMS confirmation</strong> your bank sent after the transfer
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#3b82f6" }}>
                  ✅ Make sure the <strong>amount</strong> and <strong>reference #{orderId?.slice(0, 8).toUpperCase()}</strong> are clearly visible
                </div>
              </div>

              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
                id="proof-upload"
              />
              <label
                htmlFor="proof-upload"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "16px", borderRadius: 12,
                  border: file ? "2px solid #0f172a" : "2px dashed #cbd5e1",
                  background: file ? "#f8fafc" : "#fff",
                  cursor: "pointer", fontSize: 14, fontWeight: 600,
                  color: file ? "#0f172a" : "#94a3b8",
                  marginBottom: 12, transition: "all 0.15s",
                }}
              >
                {file ? `📎 ${file.name}` : "📁 Tap to choose — photo, screenshot or PDF"}
              </label>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                style={{ ...primaryBtn, width: "100%", opacity: !file || uploading ? 0.5 : 1, fontSize: 15, padding: "15px" }}
              >
                {uploading ? "Uploading…" : uploaded ? "🔄 Resubmit Proof" : "⬆️ Upload Payment Proof"}
              </button>

              {!payment?.id && !initializing && (
                <div style={{ marginTop: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991b1b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>⚠️ Payment session not confirmed</span>
                  <button onClick={initPayment} style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>
                    Retry Init
                  </button>
                </div>
              )}

              {uploaded && !file && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, color: "#166534", fontSize: 13, fontWeight: 600 }}>
                  ✅ Proof submitted — awaiting admin verification
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div style={{ ...stepCard, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <SectionHeader icon="📱" title="Notify Us on WhatsApp" subtitle="Speed up verification by sending us a quick message" />
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "13px 24px", borderRadius: 12, background: "#25D366", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>📱</span> Open WhatsApp
              </a>
            </div>

            {/* Cancel */}
            <div style={{ ...stepCard, borderColor: "#fee2e2" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "#7f1d1d" }}>Cancel Payment</div>
              {!showCancelForm ? (
                <button onClick={() => setShowCancelForm(true)} style={{ ...outlineBtn, color: "#dc2626", borderColor: "#fca5a5" }}>
                  Cancel this payment
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input style={inputSt} placeholder="Reason for cancellation…" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
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

        {/* ── STEP 3: Done ── */}
        {uiStep === 3 && (
          <div style={{ ...stepCard, textAlign: "center", padding: "48px 32px" }}>
            {payment?.status === "paid" ? (
              <>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: "#166534", margin: "0 0 10px" }}>Payment Confirmed!</h2>
                <p style={{ color: "#166534", fontSize: 15, margin: "0 0 32px" }}>
                  Your payment of {formatCurrency(payment.amount)} has been verified.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 10px" }}>Proof Submitted!</h2>
                <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
                  We've received your proof for order <strong>#{orderId?.slice(0, 8).toUpperCase()}</strong>.
                </p>
                <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 32px" }}>
                  We'll verify and confirm your order shortly.
                </p>
              </>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300, margin: "0 auto" }}>
              <Link href="/store" style={{ ...primaryBtn, display: "block", textDecoration: "none", textAlign: "center" }}>
                🛍️ Continue Shopping
              </Link>
              <Link href="/account/orders" style={{ ...outlineBtn, display: "block", textDecoration: "none", textAlign: "center" }}>
                📦 View My Orders
              </Link>
            </div>

            {statusHistory.length > 0 && (
              <div style={{ marginTop: 32, textAlign: "left", background: "#f8fafc", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Payment Timeline</div>
                {statusHistory.map((h: any, i: number) => {
                  const [bg, col] = statusColor[h.status] ?? ["#f1f5f9", "#475569"];
                  return (
                    <div key={h.id ?? i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, background: bg, color: col, fontSize: 11, fontWeight: 700 }}>{h.status}</span>
                        {h.reason && <div style={{ fontSize: 11, color: "#64748b" }}>{h.reason}</div>}
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{h.created_at ? new Date(h.created_at).toLocaleString() : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {payment?.status !== "paid" && (
              <button onClick={() => setUiStep(2)} style={{ marginTop: 20, background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
                ← Go back to payment details
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0f172a" }}>{title}</h2>
      </div>
      {subtitle && <div style={{ fontSize: 13, color: "#64748b", paddingLeft: 30 }}>{subtitle}</div>}
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

const stepCard: React.CSSProperties = { background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 24, marginBottom: 16 };
const primaryBtn: React.CSSProperties = { padding: "13px 24px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const outlineBtn: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#475569" };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" };
const linkBtn: React.CSSProperties = { padding: "12px 28px", borderRadius: 12, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 };