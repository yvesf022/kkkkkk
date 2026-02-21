"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { paymentsApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import type { BankSettings, Payment } from "@/lib/types";

/* ─── Design tokens ─── */
const FF = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#1E3A8A";
const POLL_MS = 30_000;

/* ─── Status config ─── */
const STATUS_META: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  pending:  { bg: "#FFFBEB", fg: "#92400E", dot: "#F59E0B", label: "Pending Review" },
  on_hold:  { bg: "#FFF7ED", fg: "#7C3D0A", dot: "#F97316", label: "Under Review" },
  paid:     { bg: "#F0FDF4", fg: "#065F46", dot: "#10B981", label: "Confirmed" },
  rejected: { bg: "#FFF1F2", fg: "#9F1239", dot: "#F43F5E", label: "Rejected" },
};

/* ─── Step definitions ─── */
const STEPS = [
  { n: 1, label: "Initialize" },
  { n: 2, label: "Transfer" },
  { n: 3, label: "Upload Proof" },
  { n: 4, label: "Complete" },
] as const;

/* ─── Icons ─── */
const Spinner = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".12" />
    <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M12 16V7M12 7l-4 4M12 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 17v1.5A2.5 2.5 0 005.5 21h13a2.5 2.5 0 002.5-2.5V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const FileIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M13 2v7h7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="8" cy="11" r=".7" fill="currentColor" />
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── Helper: normalize API responses ─── */
function normalizePayments(raw: unknown): Payment[] {
  if (Array.isArray(raw)) return raw as Payment[];
  const r = raw as any;
  if (r?.results) return r.results;
  if (r?.payments) return r.payments;
  return [];
}

/* ─── CopyBtn sub-component ─── */
function CopyBtn({ value, copyKey, copied, onCopy }: { value: string; copyKey: string; copied: string | null; onCopy: (v: string, k: string) => void }) {
  const isCopied = copied === copyKey;
  return (
    <button
      onClick={() => onCopy(value, copyKey)}
      style={{
        padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0",
        background: isCopied ? "#F0FDF4" : "#fff",
        color: isCopied ? "#10B981" : "#64748B",
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 11, fontWeight: 600, fontFamily: FF, transition: "all .15s",
      }}
    >
      {isCopied ? <CheckIcon /> : <CopyIcon />}
      {isCopied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ─── BankRow sub-component ─── */
function BankRow({ label, value, copyKey, copied, onCopy, highlight }: {
  label: string; value: string; copyKey: string;
  copied: string | null; onCopy: (v: string, k: string) => void;
  highlight?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px",
      background: highlight ? "#FFFBEB" : "#F8FAFC",
      borderRadius: 10,
      border: `1px solid ${highlight ? "#FDE68A" : "#E2E8F0"}`,
      gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: highlight ? "#92400E" : "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ fontSize: highlight ? 20 : 15, fontWeight: 800, color: highlight ? "#92400E" : BRAND, marginTop: 3 }}>
          {value}
        </div>
      </div>
      <CopyBtn value={value} copyKey={copyKey} copied={copied} onCopy={onCopy} />
    </div>
  );
}

/* ─── StepNav sub-component ─── */
function StepNav({ step, completedSteps }: { step: number; completedSteps: Set<number> }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0, marginBottom: 28, overflowX: "auto" }}>
      {STEPS.map(({ n, label }, i) => {
        const done = completedSteps.has(n);
        const active = step === n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 64 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13, fontFamily: FF,
                background: done ? ACCENT : active ? "#EFF6FF" : "#F1F5F9",
                color: done ? "#fff" : active ? ACCENT : "#94A3B8",
                border: active ? `2.5px solid ${ACCENT}` : "2.5px solid transparent",
                transition: "all .3s",
              }}>
                {done ? <CheckIcon /> : n}
              </div>
              <span style={{
                fontSize: 11, marginTop: 6, textAlign: "center", whiteSpace: "nowrap",
                color: active ? ACCENT : done ? BRAND : "#94A3B8",
                fontWeight: active || done ? 700 : 400, fontFamily: FF,
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 40, height: 2, margin: "0 2px 22px",
                background: completedSteps.has(n) ? ACCENT : "#E2E8F0",
                transition: "background .3s", flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");

  // ✅ Safe selector — returns stable function reference, not a new object/array
  const clearCart = useCart((s) => s.clearCart);

  /* ─── Core state ─── */
  const [payment, setPayment]               = useState<Payment | null>(null);
  const [bankDetails, setBankDetails]       = useState<BankSettings | null>(null);
  const [initializing, setInitializing]     = useState(true);
  const [initError, setInitError]           = useState<string | null>(null);
  const [step, setStep]                     = useState<1 | 2 | 3 | 4>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  /* ─── File upload state ─── */
  const [file, setFile]           = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Cancel state ─── */
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason]     = useState("");
  const [cancelling, setCancelling]         = useState(false);

  /* ─── Retry state ─── */
  const [retrying, setRetrying] = useState(false);

  /* ─── Polling ─── */
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Copy ─── */
  const [copied, setCopied] = useState<string | null>(null);

  /* ─── Method change ─── */
  const [selectedMethod, setSelectedMethod] = useState<string>("bank_transfer");
  const [changingMethod, setChangingMethod] = useState(false);

  /* ─── Fetch bank details once ─── */
  useEffect(() => {
    paymentsApi.getBankDetails()
      .then((b: any) => {
        // API returns array or single object
        setBankDetails(Array.isArray(b) ? (b[0] ?? null) : (b ?? null));
      })
      .catch(() => {}); // non-fatal
  }, []);

  /* ─── Initialize payment ─── */
  // FIX: getByOrderId can return null if user has no payments yet → fall through to create()
  // FIX: create() returns a Payment directly (not wrapped) — handle both shapes
  const initPayment = useCallback(async () => {
    if (!orderId) { setInitError("No order ID in URL. Please return to checkout."); setInitializing(false); return; }
    setInitializing(true); setInitError(null);
    try {
      // 1. Check for existing payment on this order
      let pmt: Payment | null = null;
      try {
        const raw = await paymentsApi.getMy() as any;
        const list = normalizePayments(raw);
        pmt = list.find((p) => p.order_id === orderId) ?? null;
      } catch {
        // /payments/my failed (e.g. not logged in) — attempt to create directly
      }

      // 2. Create if none found
      if (!pmt) {
        pmt = await paymentsApi.create(orderId) as Payment;
      }

      // 3. Normalise ALL known backend response shapes:
      //    { payment: {...} }  |  { data: {...} }  |  { result: {...} }  |  plain Payment
      const raw = pmt as any;
      if (raw?.payment?.id)  pmt = raw.payment;
      else if (raw?.data?.id)    pmt = raw.data;
      else if (raw?.result?.id)  pmt = raw.result;
      // still no id? — backend might have returned the payment directly, keep as-is

      // Log to console so we can see the actual shape in production
      if (typeof window !== "undefined") {
        console.debug("[PaymentClient] resolved payment:", pmt);
      }

      if (!(pmt as any)?.id) {
        console.error("[PaymentClient] unrecognised payment shape:", raw);
        throw new Error(`Payment created (200) but response has no ID. Shape: ${Object.keys(raw ?? {}).join(", ") || "empty"}`);
      }

      setPayment(pmt);

      // 4. Route to correct step based on current status
      if (pmt.status === "paid") {
        setStep(4); setCompletedSteps(new Set([1, 2, 3, 4]));
      } else if (pmt.status === "on_hold") {
        setStep(4); setCompletedSteps(new Set([1, 2, 3]));
      } else if (pmt.status === "rejected") {
        setStep(4); setCompletedSteps(new Set([1]));
      } else if (pmt.proof) {
        // proof already uploaded but status still pending → waiting for review
        setStep(4); setCompletedSteps(new Set([1, 2, 3]));
      } else {
        // Fresh payment — go to transfer step
        setStep(2); setCompletedSteps(new Set([1]));
      }
    } catch (e: any) {
      setInitError(e?.message ?? "Could not initialize payment. Please try again.");
    } finally {
      setInitializing(false);
    }
  }, [orderId]);

  useEffect(() => { initPayment(); }, [initPayment]);

  /* ─── Poll for status changes when on_hold ─── */
  useEffect(() => {
    if (step === 4 && payment?.status === "on_hold" && payment?.id) {
      pollRef.current = setInterval(async () => {
        setPolling(true);
        try {
          const updated = await paymentsApi.getById(payment.id) as Payment;
          setPayment(updated);
          if (updated.status !== "on_hold") clearInterval(pollRef.current!);
        } catch {
          // silent — keep trying
        } finally {
          setPolling(false);
        }
      }, POLL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, payment?.status, payment?.id]);

  /* ─── Copy helper ─── */
  function copyText(value: string, key: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2200);
    }).catch(() => {});
  }

  /* ─── Upload proof → POST /api/payments/{payment_id}/proof ─── */
  // ⚠️  DO NOT call paymentsApi.uploadProof() here.
  //     The shared request() helper always spreads headers:{} into fetch(),
  //     which prevents the browser from auto-generating the multipart boundary → 422.
  //     We call fetch() directly so Content-Type is set automatically.
  async function handleUpload() {
    if (!file || !payment) return;
    setUploading(true); setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const token = typeof window !== "undefined"
        ? localStorage.getItem("karabo_token")
        : null;

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://karabo.onrender.com";

      const res = await fetch(`${API_BASE}/api/payments/${payment.id}/proof`, {
        method: "POST",
        // ✅ NO Content-Type header — browser sets multipart/form-data + boundary automatically
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        let msg = `Upload failed (${res.status})`;
        try {
          const data = await res.json();
          msg = data?.detail ?? data?.message ?? msg;
        } catch {}
        throw new Error(msg);
      }

      // ✅ Clear cart only AFTER successful proof submission
      await clearCart().catch(() => {});

      setUploaded(true); setFile(null);
      setCompletedSteps((prev) => new Set([...prev, 2, 3]));

      // Refresh payment status
      const updated = await paymentsApi.getById(payment.id) as Payment;
      setPayment(updated);
      setTimeout(() => setStep(4), 600);
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  /* ─── Cancel payment → PATCH /api/payments/{payment_id}/cancel ─── */
  async function handleCancel() {
    if (!payment || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await paymentsApi.cancel(payment.id, cancelReason);
      router.push(`/account/orders/${orderId}`);
    } catch (e: any) {
      setUploadError(e?.message ?? "Cancel failed.");
      setCancelling(false);
    }
  }

  /* ─── Retry payment → POST /api/payments/{order_id}/retry ─── */
  async function handleRetry() {
    if (!orderId) return;
    setRetrying(true);
    try {
      const newPmt = await paymentsApi.retry(orderId) as Payment;
      setPayment(newPmt);
      setCompletedSteps(new Set([1]));
      setUploaded(false); setFile(null); setUploadError(null);
      setStep(2);
    } catch (e: any) {
      setUploadError(e?.message ?? "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  /* ─── Update payment method → PATCH /api/payments/{payment_id}/method ─── */
  async function handleMethodChange(method: string) {
    if (!payment || method === payment.method) return;
    setChangingMethod(true);
    try {
      await paymentsApi.updateMethod(payment.id, method);
      setPayment((prev) => prev ? { ...prev, method: method as any } : prev);
      setSelectedMethod(method);
    } catch (e: any) {
      setUploadError(e?.message ?? "Method update failed.");
    } finally {
      setChangingMethod(false);
    }
  }

  /* ═══════════ EARLY RETURNS ═══════════ */

  if (!orderId) return (
    <div style={S.page}>
      <div style={{ ...S.card, textAlign: "center", padding: "60px 32px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={S.cardTitle}>No Order Found</h2>
        <p style={S.cardSub}>Please complete checkout before visiting this page.</p>
        <Link href="/store/cart" style={{ ...S.primaryLink, display: "inline-flex", marginTop: 20 }}>Go to Cart</Link>
      </div>
    </div>
  );

  if (initializing) return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={{ ...S.card, padding: "72px 32px", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: ACCENT }}>
          <Spinner size={24} />
        </div>
        <h2 style={S.cardTitle}>Setting up your payment…</h2>
        <p style={S.cardSub}>Connecting to secure payment session.</p>
      </div>
    </div>
  );

  if (initError || !payment) return (
    <div style={S.page}>
      <style>{CSS}</style>
      <div style={{ ...S.card, padding: "52px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={S.cardTitle}>Payment Setup Failed</h2>
        <p style={S.cardSub}>{initError}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          <button onClick={initPayment} style={S.primaryBtn}>Try Again</button>
          <Link href={`/account/orders/${orderId}`} style={S.ghostLink}>View Order</Link>
        </div>
      </div>
    </div>
  );

  /* ═══════════ MAIN RENDER ═══════════ */
  const pmt = payment;
  const pMeta = STATUS_META[pmt.status] ?? STATUS_META.pending;

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* Step indicator */}
      <StepNav step={step} completedSteps={completedSteps} />

      <div style={S.layout}>
        {/* ─── Main content ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .3s ease" }}>

          {/* Status banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 16px", borderRadius: 10,
            background: pMeta.bg, border: `1px solid ${pMeta.dot}22`,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: pMeta.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: pMeta.fg, fontFamily: FF }}>{pMeta.label}</span>
            {polling && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 5 }}>
                <Spinner size={12} /> Checking…
              </span>
            )}
            <span style={{ marginLeft: polling ? 0 : "auto", fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>
              #{pmt.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* ──── STEP 2: Bank transfer ──── */}
          {step === 2 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Transfer Funds</h2>
              <p style={{ ...S.cardSub, marginBottom: 24 }}>
                Transfer exactly{" "}
                <strong style={{ color: BRAND }}>{formatCurrency(pmt.amount)}</strong>{" "}
                to the account below. Use your order ID as the reference.
              </p>

              {/* Payment method selector */}
              <div style={{ marginBottom: 20 }}>
                <p style={S.fieldLabel}>Payment Method</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["bank_transfer", "mobile_money", "cash"].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleMethodChange(m)}
                      disabled={changingMethod}
                      style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 13, fontFamily: FF, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                        background: (pmt.method === m || selectedMethod === m) ? ACCENT : "#F8FAFC",
                        color: (pmt.method === m || selectedMethod === m) ? "#fff" : "#64748B",
                        border: (pmt.method === m || selectedMethod === m) ? `1px solid ${ACCENT}` : "1px solid #E2E8F0",
                      }}
                    >
                      {changingMethod && selectedMethod === m ? <Spinner size={12} /> : m.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank details */}
              {bankDetails ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {bankDetails.bank_name && (
                    <BankRow label="Bank" value={bankDetails.bank_name} copyKey="bank_name" copied={copied} onCopy={copyText} />
                  )}
                  {bankDetails.account_name && (
                    <BankRow label="Account Name" value={bankDetails.account_name} copyKey="account_name" copied={copied} onCopy={copyText} />
                  )}
                  {bankDetails.account_number && (
                    <BankRow label="Account Number" value={bankDetails.account_number} copyKey="account_number" copied={copied} onCopy={copyText} />
                  )}
                  {bankDetails.branch && (
                    <BankRow label="Branch" value={bankDetails.branch} copyKey="branch" copied={copied} onCopy={copyText} />
                  )}
                  {bankDetails.swift_code && (
                    <BankRow label="SWIFT / BIC" value={bankDetails.swift_code} copyKey="swift" copied={copied} onCopy={copyText} />
                  )}
                  {bankDetails.mobile_money_provider && (
                    <BankRow label="Mobile Money Provider" value={bankDetails.mobile_money_provider} copyKey="mm_provider" copied={copied} onCopy={copyText} />
                  )}
                  {bankDetails.mobile_money_number && (
                    <BankRow label="Mobile Money Number" value={bankDetails.mobile_money_number} copyKey="mm_number" copied={copied} onCopy={copyText} />
                  )}
                  {bankDetails.mobile_money_name && (
                    <BankRow label="Registered Name" value={bankDetails.mobile_money_name} copyKey="mm_name" copied={copied} onCopy={copyText} />
                  )}

                  {/* Amount highlight row */}
                  <BankRow
                    label="Amount to Transfer"
                    value={formatCurrency(pmt.amount)}
                    copyKey="amount"
                    copied={copied}
                    onCopy={copyText}
                    highlight
                  />

                  {/* Reference row */}
                  <BankRow
                    label="Reference / Narration"
                    value={orderId!.slice(0, 8).toUpperCase()}
                    copyKey="reference"
                    copied={copied}
                    onCopy={copyText}
                  />

                  {bankDetails.instructions && (
                    <div style={{ padding: "12px 16px", background: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE", fontSize: 13, color: "#1E40AF", lineHeight: 1.7 }}>
                      ℹ️ {bankDetails.instructions}
                    </div>
                  )}

                  {/* QR code */}
                  {bankDetails.qr_code_url && (
                    <div style={{ textAlign: "center", padding: "16px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                      <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10, fontFamily: FF }}>Scan to pay</p>
                      <img src={bankDetails.qr_code_url} alt="QR Code" style={{ maxWidth: 180, borderRadius: 8 }} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "14px 16px", background: "#FFF7ED", borderRadius: 10, marginBottom: 24, color: "#92400E", fontSize: 13, fontFamily: FF }}>
                  ⏳ Bank details loading… Please wait or contact support.
                </div>
              )}

              <button
                onClick={() => { setStep(3); setCompletedSteps((prev) => new Set([...prev, 2])); }}
                style={S.primaryBtn}
              >
                I've Completed the Transfer →
              </button>

              {/* Cancel link */}
              {!showCancelForm ? (
                <button
                  onClick={() => setShowCancelForm(true)}
                  style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 13, cursor: "pointer", fontFamily: FF, padding: "12px 0 0", display: "block" }}
                >
                  Cancel this payment
                </button>
              ) : (
                <div style={{ marginTop: 16, padding: "16px", background: "#FFF1F2", borderRadius: 12, border: "1px solid #FECDD3" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#9F1239", margin: "0 0 10px", fontFamily: FF }}>Cancel this payment?</p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation…"
                    rows={3}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #FECDD3", fontSize: 13, fontFamily: FF, resize: "vertical", outline: "none", background: "#fff" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling || !cancelReason.trim()}
                      style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer", opacity: cancelling || !cancelReason.trim() ? 0.6 : 1 }}
                    >
                      {cancelling ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                    <button onClick={() => setShowCancelForm(false)} style={S.ghostBtn}>Keep</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──── STEP 3: Upload proof ──── */}
          {step === 3 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Upload Proof of Payment</h2>
              <p style={{ ...S.cardSub, marginBottom: 22 }}>
                Upload your bank transfer receipt, screenshot, or confirmation email.
              </p>

              {uploadError && (
                <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#9F1239", fontFamily: FF }}>
                  <AlertIcon /> {uploadError}
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? ACCENT : file ? "#10B981" : "#CBD5E1"}`,
                  borderRadius: 14, padding: "36px 20px", textAlign: "center", cursor: "pointer",
                  background: dragOver ? "#EFF6FF" : file ? "#F0FDF4" : "#F8FAFC",
                  marginBottom: 20, transition: "all .2s",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ color: "#10B981" }}><FileIcon /></div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: BRAND, fontFamily: FF }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: "#64748B", fontFamily: FF }}>{(file.size / 1024).toFixed(1)} KB</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: FF }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ color: "#94A3B8" }}><UploadIcon /></div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: BRAND, fontFamily: FF }}>Drop file here or click to browse</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: FF }}>PNG, JPG, PDF · Max 10 MB</div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  style={{ ...S.primaryBtn, opacity: (!file || uploading) ? 0.6 : 1 }}
                >
                  {uploading ? <><Spinner size={16} /> Uploading…</> : "Submit Proof"}
                </button>
                <button
                  onClick={() => { setStep(2); setCompletedSteps((prev) => { const n = new Set(prev); n.delete(2); return n; }); }}
                  style={S.ghostBtn}
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* ──── STEP 4: Status / completion ──── */}
          {step === 4 && (
            <div style={S.card}>
              {/* PAID */}
              {pmt.status === "paid" && (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <div style={{ fontSize: 52, marginBottom: 16, animation: "pop .4s ease" }}>✅</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#065F46", margin: "0 0 8px", fontFamily: FF }}>Payment Confirmed!</h2>
                  <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, maxWidth: 340, margin: "0 auto 28px", fontFamily: FF }}>
                    Your payment of <strong>{formatCurrency(pmt.amount)}</strong> has been confirmed. Your order is being processed.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 280, margin: "0 auto" }}>
                    <Link href={`/account/orders/${orderId}`} style={{ ...S.primaryLink, justifyContent: "center" }}>
                      View My Order →
                    </Link>
                    <Link href="/store" style={{ ...S.ghostLink, justifyContent: "center" }}>
                      Continue Shopping
                    </Link>
                  </div>
                </div>
              )}

              {/* REJECTED */}
              {pmt.status === "rejected" && (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#9F1239", margin: "0 0 8px", fontFamily: FF }}>Payment Rejected</h2>
                  {pmt.admin_notes && (
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, maxWidth: 340, margin: "0 auto 20px", fontFamily: FF }}>
                      Reason: {pmt.admin_notes}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={handleRetry} disabled={retrying} style={S.primaryBtn}>
                      {retrying ? <><Spinner size={16} /> Retrying…</> : "↺ Retry Payment"}
                    </button>
                    <Link href={`/account/orders/${orderId}`} style={S.ghostLink}>View Order</Link>
                  </div>
                </div>
              )}

              {/* ON HOLD / PENDING review */}
              {(pmt.status === "on_hold" || pmt.status === "pending") && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 16, animation: "pop .4s ease" }}>
                    ⏳
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#7C3D0A", margin: "0 0 8px", fontFamily: FF }}>Under Review</h2>
                  <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, maxWidth: 360, marginBottom: 8, fontFamily: FF }}>
                    Your proof of payment has been submitted. You'll be notified once confirmed — usually within a few hours.
                  </p>
                  <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 24, display: "flex", alignItems: "center", gap: 5, fontFamily: FF }}>
                    <ClockIcon /> Auto-checking every 30 seconds
                  </p>

                  {/* Progress tracker */}
                  <div style={{ width: "100%", background: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
                    {[
                      { label: "Payment initialized", done: true },
                      { label: "Transfer completed", done: true },
                      { label: "Proof uploaded", done: true },
                      { label: "Admin review", active: true },
                      { label: "Order confirmed", done: false },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i < 4 ? 10 : 0, alignItems: "flex-start" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: item.done ? "#10B981" : item.active ? "#F97316" : "#E2E8F0" }} />
                        <span style={{ fontSize: 13, color: item.done ? BRAND : item.active ? "#7C3D0A" : "#94A3B8", fontWeight: (item.done || item.active) ? 600 : 400, fontFamily: FF }}>
                          {item.label}
                        </span>
                        {item.active && (
                          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: "#F97316", textTransform: "uppercase", fontFamily: FF }}>In Progress</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
                    <Link href={`/account/orders/${orderId}`} style={{ ...S.primaryLink, justifyContent: "center" }}>
                      View Order Status →
                    </Link>
                    <Link href="/store" style={{ ...S.ghostLink, justifyContent: "center" }}>
                      Continue Shopping
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Sidebar ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Order summary */}
          <div style={{ ...S.card, padding: "20px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: BRAND, margin: "0 0 14px", fontFamily: FF }}>Order Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", fontFamily: FF }}>
                <span>Order</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: BRAND }}>#{orderId?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", fontFamily: FF }}>
                <span>Payment ID</span>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#94A3B8" }}>{pmt.id.slice(0, 12)}…</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", fontFamily: FF }}>
                <span>Method</span>
                <span style={{ fontWeight: 600, color: BRAND, textTransform: "capitalize" }}>{pmt.method.replace(/_/g, " ")}</span>
              </div>
              <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, color: BRAND, fontSize: 15, fontFamily: FF }}>Total Due</span>
                <span style={{ fontWeight: 800, color: BRAND, fontSize: 15, fontFamily: FF }}>{formatCurrency(pmt.amount)}</span>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div style={{ padding: "12px 16px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, lineHeight: 1.8, fontFamily: FF }}>
              🔒 Secure payment session. Your proof is reviewed by our team — usually within a few hours. Contact support for help.
            </p>
          </div>

          {/* Status history shortcut */}
          <Link
            href={`/account/orders/${orderId}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 16px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", textDecoration: "none", fontSize: 13, fontWeight: 600, fontFamily: FF }}
          >
            View Order Details →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const CSS = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pop { 0%{transform:scale(.6);opacity:0;} 70%{transform:scale(1.1);} 100%{transform:scale(1);opacity:1;} }
  * { box-sizing: border-box; }
`;

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px", fontFamily: FF },
  layout: { display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "start" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "28px" },
  cardTitle: { fontSize: 20, fontWeight: 800, color: BRAND, letterSpacing: "-0.02em", margin: "0 0 6px", fontFamily: FF },
  cardSub: { fontSize: 14, color: "#64748B", margin: 0, lineHeight: 1.6, fontFamily: FF },
  fieldLabel: { fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px", fontFamily: FF },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 22px", borderRadius: 10,
    background: ACCENT, color: "#fff", border: "none",
    fontWeight: 800, fontSize: 14, fontFamily: FF, cursor: "pointer",
    boxShadow: "0 2px 12px rgba(30,58,138,.25)", transition: "opacity .15s",
  },
  primaryLink: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "12px 22px", borderRadius: 10,
    background: ACCENT, color: "#fff", textDecoration: "none",
    fontWeight: 800, fontSize: 14, fontFamily: FF,
    boxShadow: "0 2px 12px rgba(30,58,138,.25)",
  },
  ghostBtn: {
    display: "inline-flex", alignItems: "center",
    padding: "11px 18px", borderRadius: 10,
    border: "1px solid #E2E8F0", background: "transparent",
    color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer",
  },
  ghostLink: {
    display: "flex", alignItems: "center",
    padding: "11px 18px", borderRadius: 10,
    border: "1px solid #E2E8F0", background: "transparent",
    color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 13, fontFamily: FF,
  },
};