"use client";

/**
 * PaymentClient — Amazon-grade payment flow
 *
 * FIXES:
 * 1. initPayment() fallback now uses paymentsApi.getByOrderId() which correctly
 *    scans /api/payments/my and filters by order_id — instead of wrongly calling
 *    GET /api/payments/{orderId} with an orderId treated as paymentId (404/wrong data).
 * 2. Status routing fixed: "on_hold" (proof under review) now correctly lands on
 *    Step 4 (pending verification), NOT Step 2 (transfer funds).
 * 3. Cart is cleared after successful order creation (handled via clearCart prop).
 * 4. Encoding fixed: arrow and checkmark characters are proper Unicode.
 * 5. Step label shows "Step X of 3" correctly (was showing 4 steps as 3).
 * 6. "rejected" status on an existing payment now correctly shows retry UI at Step 2.
 * 7. Timer auto-polls payment status every 30s when on_hold (proof submitted, waiting review).
 */

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

import { paymentsApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { BankSettings, Payment } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const WHATSAPP_NUMBER = "919253258848";
const POLL_INTERVAL_MS = 30_000; // 30 seconds

/* ─── Icons ─── */
const Icon = {
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Upload: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 14V5M11 5l-3.5 3.5M11 5l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 15v1.5A2.5 2.5 0 005.5 19h11a2.5 2.5 0 002.5-2.5V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  File: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M10 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 2v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  Whatsapp: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  Warning: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="11" r=".7" fill="currentColor"/>
    </svg>
  ),
  Spinner: () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ animation: "kspin 0.7s linear infinite" }}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15"/>
      <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 8A5.5 5.5 0 112.5 5M2.5 2v3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ─── Status metadata ─── */
const STATUS_META: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  pending:  { bg: "#FFFBEB", fg: "#92400E", dot: "#F59E0B", label: "Pending" },
  on_hold:  { bg: "#FFF7ED", fg: "#7C3D0A", dot: "#F97316", label: "Under Review" },
  paid:     { bg: "#F0FDF4", fg: "#065F46", dot: "#10B981", label: "Paid" },
  rejected: { bg: "#FFF1F2", fg: "#9F1239", dot: "#F43F5E", label: "Rejected" },
};

/* ─── Nav steps ─── */
const NAV_STEPS = [
  { n: 1, label: "Initialize" },
  { n: 2, label: "Transfer Funds" },
  { n: 3, label: "Upload Proof" },
  { n: 4, label: "Complete" },
];

export default function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const clearCart = useCart((s) => s.clearCart);

  /* ── State ── */
  const [payment, setPayment]             = useState<Payment | null>(null);
  const [bankDetails, setBankDetails]     = useState<BankSettings | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [initializing, setInitializing]   = useState(false); // FIX: start false so method select shows first
  const [initError, setInitError]         = useState<string | null>(null);

  // FIX: Payment method must be selected before creating payment session
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "mobile_money" | "cash" | "card" | null>(null);
  const [methodSelected, setMethodSelected] = useState(false);

  const [file, setFile]           = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* 1=init  2=transfer  3=upload  4=done */
  const [uiStep, setUiStep]               = useState<1 | 2 | 3 | 4>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const [cancelling, setCancelling]       = useState(false);
  const [cancelReason, setCancelReason]   = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [retrying, setRetrying]           = useState(false);
  const [copied, setCopied]               = useState<string | null>(null);
  const [polling, setPolling]             = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch bank details once ── */
  useEffect(() => {
    paymentsApi.getBankDetails()
      .then((b) => setBankDetails(b as BankSettings))
      .catch(() => {});
  }, []);

  /* ── Clear cart once on mount (order was just placed) ── */
  useEffect(() => {
    // Only clear when we land here fresh from order creation.
    // We check sessionStorage to avoid clearing on every page visit/refresh.
    const key = `cart_cleared_${orderId}`;
    if (orderId && !sessionStorage.getItem(key)) {
      clearCart().catch(() => {});
      sessionStorage.setItem(key, "1");
    }
  }, [orderId, clearCart]);

  /* ── Poll for status updates when proof is submitted and under review ── */
  useEffect(() => {
    if (uiStep === 4 && payment?.status === "on_hold" && payment?.id) {
      pollTimerRef.current = setInterval(async () => {
        try {
          setPolling(true);
          const updated = await paymentsApi.getById(payment.id) as Payment;
          setPayment(updated);
          if (updated.status === "paid") {
            clearInterval(pollTimerRef.current!);
            toast.success("Payment confirmed! 🎉");
          } else if (updated.status === "rejected") {
            clearInterval(pollTimerRef.current!);
            toast.error("Payment was rejected. Please start over.");
            setUiStep(2);
            setCompletedSteps(new Set([1]));
          }
        } catch {}
        finally { setPolling(false); }
      }, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [uiStep, payment?.status, payment?.id]);

  /* ── Init payment ── */
  const initPayment = useCallback(async () => {
    if (!orderId) return;
    // FIX: Require method to be selected before creating payment
    const method = paymentMethod ?? "bank_transfer";
    setInitializing(true);
    setInitError(null);
    let resolved: Payment | null = null;

    // Step 1: Try to create a new payment session with the selected method
    try {
      resolved = await paymentsApi.create(orderId, { method }) as Payment;
    } catch {
      // Payment likely already exists for this order (409 conflict or similar).
      // Step 2: Look up existing payment by scanning user's payment list.
      resolved = await paymentsApi.getByOrderId(orderId);
    }

    if (!resolved) {
      setInitError("Could not initialize payment. Please try again.");
      setInitializing(false);
      return;
    }

    setPayment(resolved);

    // Load status history
    try {
      const h = await paymentsApi.getStatusHistory(resolved.id) as any;
      setStatusHistory(Array.isArray(h) ? h : h?.history ?? []);
    } catch {}

    const hasProof = !!resolved.proof?.file_url;
    if (hasProof) setUploaded(true);

    // FIX: Route to correct step based on actual payment status
    // - paid → Step 4 (confirmed)
    // - on_hold → Step 4 (proof submitted, awaiting admin review)
    // - rejected → Step 2 (transfer again, show rejection alert)
    // - pending + has proof → Step 4 (submitted)
    // - pending + no proof → Step 2 (transfer)
    if (resolved.status === "paid") {
      setCompletedSteps(new Set([1, 2, 3]));
      setUiStep(4);
    } else if (resolved.status === "on_hold") {
      setCompletedSteps(new Set([1, 2, 3]));
      setUiStep(4);
    } else if (resolved.status === "rejected") {
      setCompletedSteps(new Set([1]));
      setUiStep(2);
    } else if (hasProof) {
      // pending but proof was uploaded previously
      setCompletedSteps(new Set([1, 2, 3]));
      setUiStep(4);
    } else {
      setCompletedSteps(new Set([1]));
      setUiStep(2);
    }

    setInitializing(false);
  }, [orderId, paymentMethod]);

  useEffect(() => {
    if (methodSelected) { initPayment(); }
  }, [initPayment, methodSelected]);

  /* ── Actions ── */
  function markTransferDone() {
    setCompletedSteps((prev) => new Set([...prev, 1, 2]));
    setUiStep(3);
  }

  async function handleUpload() {
    if (!file) { toast.error("Please select a file first"); return; }
    if (!payment?.id) { toast.error("Payment session not confirmed"); return; }
    setUploading(true);
    try {
      if (uploaded) {
        await paymentsApi.resubmitProof(payment.id, file);
        toast.success("Proof resubmitted!");
      } else {
        await paymentsApi.uploadProof(payment.id, file);
        toast.success("Proof uploaded — we'll verify shortly.");
      }
      setFile(null);
      const updated = await paymentsApi.getById(payment.id) as Payment;
      setPayment(updated);
      setUploaded(true);
      setCompletedSteps(new Set([1, 2, 3]));
      setUiStep(4);
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
    } finally { setCancelling(false); }
  }

  async function handleRetry() {
    if (!orderId) return;
    setRetrying(true);
    try {
      const p = await paymentsApi.retry(orderId) as Payment;
      setPayment(p);
      setUploaded(false);
      setStatusHistory([]);
      setCompletedSteps(new Set([1]));
      setUiStep(2);
      toast.success("New payment session started.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to retry payment");
    } finally { setRetrying(false); }
  }

  async function refreshStatus() {
    if (!payment?.id) return;
    setPolling(true);
    try {
      const updated = await paymentsApi.getById(payment.id) as Payment;
      setPayment(updated);
      if (updated.status === "paid") {
        toast.success("Payment confirmed!");
      } else if (updated.status === "rejected") {
        toast.error("Payment rejected.");
        setUiStep(2);
        setCompletedSteps(new Set([1]));
      } else {
        toast("Status unchanged — still under review.", { icon: "⏳" });
      }
    } catch (e: any) {
      toast.error("Could not refresh status");
    } finally { setPolling(false); }
  }

  function copyValue(val: string, key: string) {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  }

  /* ── Guards ── */
  if (!orderId) return (
    <Centered>
      <div style={S.emptyIcon}><Icon.Warning /></div>
      <h2 style={S.emptyTitle}>Invalid payment link</h2>
      <p style={S.emptyBody}>No order ID was found in this URL.</p>
      <Link href="/account/orders" style={S.primaryLink}>Go to Orders</Link>
    </Centered>
  );

  const shortId = orderId.slice(0, 8).toUpperCase();
  const refCode = `ORD-${shortId}`;
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hello, I've completed payment for Order #${shortId}. Please verify.`
  )}`;
  const sm = STATUS_META[payment?.status ?? "pending"] ?? STATUS_META.pending;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes kspin  { to { transform: rotate(360deg); } }
        @keyframes kfadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes kpop   { 0%{transform:scale(0);opacity:0} 65%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes kpulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes kshimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .kpanel { animation: kfadeUp .3s ease both; }
        .kbtn { transition: transform .15s, box-shadow .15s; }
        .kbtn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,.18) !important; }
        .kbtn:active:not(:disabled) { transform: translateY(0); }
        .kghost:hover { background: #F1F5F9 !important; }
        .kcopy:hover  { background: #EFF6FF !important; color: #1D4ED8 !important; border-color: #93C5FD !important; }
        .kdrop:hover  { border-color: #3B82F6 !important; background: #EFF6FF !important; }
        .kwa:hover    { background: #1da84e !important; }
        .kcancel:hover { color: #EF4444 !important; }
        @media (max-width: 640px) {
          .kroot { flex-direction: column !important; }
          .ksidebar { width: 100% !important; height: auto !important; position: relative !important; max-height: none !important; border-right: none !important; border-bottom: 1px solid #E2E8F0 !important; flex-direction: row !important; flex-wrap: wrap !important; padding: 14px 16px !important; gap: 12px !important; }
          .kmain { padding: 16px 16px 48px !important; }
        }
      `}</style>

      <div style={S.root} className="kroot">

        {/* ── Sidebar ── */}
        <aside style={S.sidebar} className="ksidebar">
          <div style={S.orderBadge}>
            <span style={S.orderBadgeLabel}>Order</span>
            <span style={S.orderBadgeId}>{shortId}</span>
            {payment?.amount != null && (
              <span style={S.orderBadgeAmt}>{formatCurrency(payment.amount)}</span>
            )}
            {payment?.status && (
              <span style={{ ...S.statusPill, background: sm.bg, color: sm.fg }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot, display: "inline-block", marginRight: 5, flexShrink: 0 }} />
                {sm.label}
              </span>
            )}
          </div>

          <nav style={{ padding: "0 0 8px" }}>
            {NAV_STEPS.map((s, i) => {
              const done   = completedSteps.has(s.n);
              const active = uiStep === s.n;
              const locked = !done && !active;
              return (
                <div key={s.n} style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {i < 3 && (
                    <div style={{
                      position: "absolute", left: 15, top: 30, width: 2, height: 28,
                      background: done ? "#10B981" : "#E2E8F0",
                      transition: "background .3s", zIndex: 0,
                    }} />
                  )}
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "#10B981" : active ? "#1E3A8A" : "#EEF2FF",
                    color: done || active ? "#fff" : "#94A3B8",
                    fontSize: 12, fontWeight: 700,
                    boxShadow: active && !done ? "0 0 0 5px rgba(30,58,138,.12)" : "none",
                    transition: "all .25s", zIndex: 1,
                    animation: done ? "kpop .3s ease" : "none",
                    opacity: locked ? 0.45 : 1,
                  }}>
                    {done ? <Icon.Check /> : s.n}
                  </div>
                  <div style={{ paddingTop: 5, paddingBottom: 28, opacity: locked ? 0.45 : 1 }}>
                    <span style={{
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      color: done ? "#10B981" : active ? "#1E3A8A" : "#94A3B8",
                      transition: "color .2s", fontFamily: "'Sora', sans-serif",
                    }}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </nav>

          <div style={S.sideHelp}>
            <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Need assistance?</p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: "#059669", textDecoration: "none" }}>
              Chat on WhatsApp →
            </a>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={S.main} className="kmain">

          {/* ══ STEP 1: Method Selection + Initializing ══ */}
          {uiStep === 1 && (
            <div className="kpanel" style={S.panel}>
              <StepLabel n={1} />
              <h1 style={S.panelTitle}>Choose payment method</h1>
              <p style={S.panelSub}>How would you like to pay?</p>

              {/* FIX: Method must be selected before payment session is created */}
              {!methodSelected ? (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  {([
                    { value: "bank_transfer",  label: "Bank Transfer",   icon: "🏦", desc: "EFT or direct deposit" },
                    { value: "mobile_money",   label: "Mobile Money",    icon: "📱", desc: "M-Pesa, EcoCash, etc." },
                    { value: "cash",           label: "Cash Deposit",    icon: "💵", desc: "Deposit at branch" },
                    { value: "card",           label: "Card Payment",    icon: "💳", desc: "Debit or credit card" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPaymentMethod(opt.value)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 18px", borderRadius: 12,
                        border: `2px solid ${paymentMethod === opt.value ? "#1E3A8A" : "#E2E8F0"}`,
                        background: paymentMethod === opt.value ? "#EFF6FF" : "#fff",
                        cursor: "pointer", textAlign: "left", fontFamily: FF,
                        transition: "all .15s",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{opt.icon}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: paymentMethod === opt.value ? "#1E3A8A" : "#0F172A", margin: 0 }}>{opt.label}</p>
                        <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>{opt.desc}</p>
                      </div>
                      {paymentMethod === opt.value && (
                        <span style={{ marginLeft: "auto", color: "#1E3A8A" }}><Icon.Check /></span>
                      )}
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      if (!paymentMethod) { toast.error("Please select a payment method"); return; }
                      setMethodSelected(true);
                    }}
                    disabled={!paymentMethod}
                    style={{ ...S.primaryBtn, marginTop: 8, opacity: paymentMethod ? 1 : 0.45 }}
                    className="kbtn"
                  >
                    Continue →
                  </button>
                </div>
              ) : initializing ? (
                <div style={S.loadCenter}>
                  <div style={S.spinRing}><Icon.Spinner /></div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Setting up your payment…</p>
                  <p style={{ fontSize: 13, color: "#94A3B8" }}>Just a moment</p>
                </div>
              ) : initError ? (
                <div style={S.errSection}>
                  <div style={S.errIconRing}><Icon.Warning /></div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>Unable to initialize</p>
                  <p style={{ fontSize: 13, color: "#64748B", maxWidth: 340, textAlign: "center" }}>{initError}</p>
                  <button onClick={initPayment} style={S.primaryBtn} className="kbtn">Try Again</button>
                  <Link href="/account/orders" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "underline" }}>← Back to Orders</Link>
                </div>
              ) : null}
            </div>
          )}

          {/* ══ STEP 2: Transfer Funds ══ */}
          {uiStep === 2 && (
            <div className="kpanel">
              {/* FIX: Rejected alert — show retry option */}
              {payment?.status === "rejected" && (
                <div style={S.alertRed}>
                  <div style={{ color: "#F43F5E", flexShrink: 0 }}><Icon.Warning /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#9F1239" }}>Payment was rejected</p>
                    {payment?.admin_notes && (
                      <p style={{ fontSize: 13, color: "#881337", marginTop: 3 }}>{payment.admin_notes}</p>
                    )}
                    <p style={{ fontSize: 12, color: "#BE123C", marginTop: 4 }}>
                      Please make a new transfer and upload fresh proof.
                    </p>
                  </div>
                  <button onClick={handleRetry} disabled={retrying} style={S.alertBtn} className="kbtn">
                    {retrying ? <Icon.Spinner /> : "Start Over"}
                  </button>
                </div>
              )}

              <div style={S.panel}>
                <StepLabel n={2} />
                <h1 style={S.panelTitle}>Transfer funds to our account</h1>
                <p style={S.panelSub}>Use your banking app, mobile money, or visit a branch</p>

                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                  {bankDetails ? (
                    <>
                      {bankDetails.bank_name     && <BField label="Bank"           value={bankDetails.bank_name} />}
                      {bankDetails.account_name  && <BField label="Account name"   value={bankDetails.account_name} />}
                      {bankDetails.account_number && <BField label="Account number" value={bankDetails.account_number} copyKey="acc" onCopy={() => copyValue(bankDetails.account_number!, "acc")} copied={copied === "acc"} mono />}
                      {bankDetails.branch        && <BField label="Branch"         value={bankDetails.branch} />}
                      {bankDetails.swift_code    && <BField label="Swift / BIC"    value={bankDetails.swift_code} copyKey="swift" onCopy={() => copyValue(bankDetails.swift_code!, "swift")} copied={copied === "swift"} mono />}
                      {bankDetails.mobile_money_number && <BField label={bankDetails.mobile_money_provider ?? "Mobile money"} value={bankDetails.mobile_money_number} copyKey="mm" onCopy={() => copyValue(bankDetails.mobile_money_number!, "mm")} copied={copied === "mm"} mono />}
                    </>
                  ) : (
                    <>
                      <BField label="Bank"           value="Standard Lesotho Bank" />
                      <BField label="Account name"   value="Karabo Online Store" />
                      <BField label="Account number" value="123456789" copyKey="acc" onCopy={() => copyValue("123456789", "acc")} copied={copied === "acc"} mono />
                    </>
                  )}
                  <BField
                    label="Payment reference"
                    value={refCode}
                    copyKey="ref"
                    onCopy={() => copyValue(refCode, "ref")}
                    copied={copied === "ref"}
                    mono highlight
                  />
                </div>

                {bankDetails?.instructions && (
                  <div style={S.infoBox}>
                    <p style={{ fontSize: 13, color: "#78350F", lineHeight: 1.6 }}>{bankDetails.instructions}</p>
                  </div>
                )}

                <div style={S.refNote}>
                  Always include <strong>{refCode}</strong> as your payment reference so we can match your transfer.
                </div>

                <div style={S.actions}>
                  <button onClick={markTransferDone} style={S.primaryBtn} className="kbtn">
                    I&apos;ve completed the transfer →
                  </button>
                </div>
              </div>

              <CancelBar
                show={showCancelForm} onShow={() => setShowCancelForm(true)} onHide={() => setShowCancelForm(false)}
                reason={cancelReason} onChange={setCancelReason}
                onConfirm={handleCancel} loading={cancelling}
              />
            </div>
          )}

          {/* ══ STEP 3: Upload Proof ══ */}
          {uiStep === 3 && (
            <div className="kpanel">
              {!payment?.id && initializing && (
                <div style={{ ...S.panel, textAlign: "center", padding: "32px" }}>
                  <div style={S.loadCenter}>
                    <div style={S.spinRing}><Icon.Spinner /></div>
                    <p style={{ fontSize: 14, color: "#64748B" }}>Reconnecting to your payment session…</p>
                  </div>
                </div>
              )}

              {(payment?.id || (!payment?.id && !initializing)) && (
                <div style={S.panel}>
                  <StepLabel n={3} />
                  <h1 style={S.panelTitle}>{uploaded ? "Resubmit payment proof" : "Upload payment proof"}</h1>
                  <p style={S.panelSub}>Screenshot, bank slip, or SMS confirmation of your transfer</p>

                  {/* Drop zone */}
                  <div
                    className="kdrop"
                    style={{
                      ...S.dropZone,
                      marginTop: 20,
                      borderColor: dragOver ? "#3B82F6" : file ? "#10B981" : "#CBD5E1",
                      background:  dragOver ? "#EFF6FF" : file ? "#F0FDF4" : "#FAFAFA",
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef} type="file" accept="image/*,application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      style={{ display: "none" }}
                    />
                    {file ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#DCFCE7", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon.File />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>{file.name}</p>
                          <p style={{ fontSize: 12, color: "#94A3B8" }}>{(file.size / 1024).toFixed(0)} KB &nbsp;·&nbsp; tap to change</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#EFF6FF", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon.Upload />
                        </div>
                        <p style={{ fontSize: 14, color: "#475569", fontWeight: 500 }}>
                          Drop file here or <span style={{ color: "#2563EB", fontWeight: 700 }}>browse</span>
                        </p>
                        <p style={{ fontSize: 12, color: "#94A3B8" }}>PNG · JPG · PDF &nbsp;·&nbsp; max 10 MB</p>
                      </div>
                    )}
                  </div>

                  <div style={S.proofGuide}>
                    <p style={S.proofGuideHead}>What counts as proof?</p>
                    <ul style={S.proofGuideList}>
                      <li>Bank app screenshot showing the transfer sent</li>
                      <li>ATM or teller deposit slip</li>
                      <li>SMS confirmation from your bank</li>
                    </ul>
                    <p style={S.proofGuideNote}>
                      Make sure the <strong>amount</strong> and reference <strong>{refCode}</strong> are clearly visible.
                    </p>
                  </div>

                  {!payment?.id && !initializing && (
                    <div style={S.sessionWarn}>
                      <Icon.Warning />
                      <span>Payment session not confirmed.</span>
                      <button onClick={initPayment} style={S.retryInline}>Retry</button>
                    </div>
                  )}

                  <div style={S.actions}>
                    <button
                      onClick={handleUpload}
                      disabled={!file || uploading || !payment?.id}
                      style={{ ...S.primaryBtn, opacity: !file || uploading || !payment?.id ? 0.48 : 1 }}
                      className="kbtn"
                    >
                      {uploading
                        ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon.Spinner /> Uploading…</span>
                        : uploaded ? "Resubmit Proof" : "Submit Proof"}
                    </button>
                    <button onClick={() => setUiStep(2)} style={S.ghostBtn} className="kghost">
                      ← Back to transfer
                    </button>
                  </div>
                </div>
              )}

              <div style={S.waPanel}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#065F46", marginBottom: 3 }}>Speed up verification</p>
                  <p style={{ fontSize: 13, color: "#6B7280" }}>Send us a quick message after uploading</p>
                </div>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={S.waBtn} className="kwa">
                  <Icon.Whatsapp />
                  <span>WhatsApp us</span>
                </a>
              </div>

              <CancelBar
                show={showCancelForm} onShow={() => setShowCancelForm(true)} onHide={() => setShowCancelForm(false)}
                reason={cancelReason} onChange={setCancelReason}
                onConfirm={handleCancel} loading={cancelling}
              />
            </div>
          )}

          {/* ══ STEP 4: Complete ══ */}
          {uiStep === 4 && (
            <div className="kpanel">
              <div style={S.panel}>
                {payment?.status === "paid" ? (
                  /* Fully paid */
                  <div style={S.successWrap}>
                    <div style={{ ...S.successRing, background: "#F0FDF4", color: "#10B981" }}><Icon.Check /></div>
                    <h1 style={{ ...S.panelTitle, marginTop: 16 }}>Payment confirmed</h1>
                    {payment.amount != null && (
                      <p style={{ fontSize: 20, fontWeight: 700, color: "#10B981" }}>{formatCurrency(payment.amount)}</p>
                    )}
                    <p style={S.successBody}>Your payment has been verified and your order is being processed.</p>
                  </div>
                ) : (
                  /* FIX: on_hold → "Proof received, under review" message */
                  <div style={S.successWrap}>
                    <div style={{ ...S.successRing, background: "#FFF7ED", color: "#F97316" }}>
                      <Icon.Clock />
                    </div>
                    <h1 style={{ ...S.panelTitle, marginTop: 16 }}>Proof received — under review</h1>
                    <p style={S.successBody}>
                      We&apos;ve received your payment proof for order <strong>#{shortId}</strong>.<br />
                      We&apos;ll verify and update your order within a few hours.
                    </p>
                    {/* Manual refresh button */}
                    <button
                      onClick={refreshStatus}
                      disabled={polling}
                      style={{ ...S.ghostBtn, marginTop: 8, display: "inline-flex", gap: 6 }}
                      className="kbtn"
                    >
                      {polling ? <Icon.Spinner /> : <Icon.Refresh />}
                      {polling ? "Checking…" : "Check status"}
                    </button>
                    <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                      Auto-refreshes every 30 seconds
                    </p>
                  </div>
                )}

                <div style={S.doneLinks}>
                  <Link href="/store" style={S.primaryLink}>Continue Shopping</Link>
                  <Link href="/account/orders" style={S.ghostLink}>View My Orders</Link>
                </div>

                {/* Allow going back to resubmit if still pending/on_hold */}
                {payment?.status !== "paid" && (
                  <button onClick={() => setUiStep(3)} style={S.textBtn}>← Resubmit or change proof</button>
                )}
              </div>

              {statusHistory.length > 0 && (
                <div style={S.timeline}>
                  <p style={S.timelineHead}>Payment timeline</p>
                  {statusHistory.map((h: any, i: number) => {
                    const m = STATUS_META[h.status] ?? { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8", label: h.status };
                    return (
                      <div key={h.id ?? i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 99, background: m.bg, color: m.fg, fontSize: 11, fontWeight: 700 }}>{m.label}</span>
                          {h.reason && <p style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{h.reason}</p>}
                          <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                            {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}

/* ─── Sub-components ─── */

function StepLabel({ n }: { n: number }) {
  // FIX: Steps are 1 of 3 (init is automatic), so visible steps are 2-4 mapped to 1-3
  const displayN = Math.max(1, n - 1);
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "#94A3B8",
      marginBottom: 8, fontFamily: "'Sora', sans-serif",
    }}>
      Step {displayN} of 3
    </p>
  );
}

function BField({ label, value, onCopy, copyKey, copied, mono, highlight }: {
  label: string; value: string;
  onCopy?: () => void; copyKey?: string; copied?: boolean;
  mono?: boolean; highlight?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "13px 16px", borderRadius: 10,
      background: highlight ? "#EFF6FF" : "#F8FAFC",
      border: `1px solid ${highlight ? "#BFDBFE" : "#F1F5F9"}`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: highlight ? "#1E3A8A" : "#0F172A",
          fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
        }}>
          {value}
        </span>
        {onCopy && (
          <button
            onClick={onCopy} className="kcopy"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6,
              border: "1px solid #E2E8F0",
              background: copied ? "#F0FDF4" : "#F8FAFC",
              color: copied ? "#059669" : "#64748B",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              transition: "all .15s", fontFamily: "'Sora', sans-serif",
            }}
          >
            {copied ? <>&#x2713;&nbsp;Copied</> : <><Icon.Copy /> Copy</>}
          </button>
        )}
      </div>
    </div>
  );
}

function CancelBar({ show, onShow, onHide, reason, onChange, onConfirm, loading }: {
  show: boolean; onShow: () => void; onHide: () => void;
  reason: string; onChange: (v: string) => void;
  onConfirm: () => void; loading: boolean;
}) {
  return (
    <div style={S.cancelWrap}>
      {!show ? (
        <button onClick={onShow} style={S.cancelLink} className="kcancel">
          Cancel this payment
        </button>
      ) : (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Why are you cancelling?</p>
          <textarea
            value={reason} onChange={(e) => onChange(e.target.value)}
            placeholder="Tell us why…" rows={3}
            style={S.cancelTA}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              onClick={onConfirm} disabled={loading || !reason.trim()}
              style={{ ...S.dangerBtn, opacity: !reason.trim() ? 0.5 : 1 }}
              className="kbtn"
            >
              {loading ? "Cancelling…" : "Confirm Cancellation"}
            </button>
            <button onClick={onHide} style={S.ghostBtn} className="kghost">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "'Sora', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "48px 40px", maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const FF = "'Sora', -apple-system, sans-serif";

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "auto", background: "#F8FAFC", fontFamily: FF },

  sidebar: {
    width: 230, flexShrink: 0,
    background: "#fff", borderRight: "1px solid #E2E8F0",
    position: "sticky", top: 0, height: "100%", maxHeight: "100vh", overflowY: "auto",
    display: "flex", flexDirection: "column",
    padding: "20px 18px", gap: 20,
  },
  orderBadge: { display: "flex", flexDirection: "column", gap: 5 },
  orderBadgeLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94A3B8" },
  orderBadgeId:    { fontSize: 19, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em", fontFamily: "'JetBrains Mono', monospace" },
  orderBadgeAmt:   { fontSize: 14, fontWeight: 600, color: "#475569" },
  statusPill: {
    display: "inline-flex", alignItems: "center",
    padding: "4px 10px", borderRadius: 99,
    fontSize: 11, fontWeight: 700, width: "fit-content",
  },
  sideHelp: {
    marginTop: "auto", padding: "16px", background: "#F8FAFC",
    borderRadius: 12, border: "1px solid #E2E8F0",
  },

  main: { flex: 1, padding: "20px 32px 48px", maxWidth: 660 },

  panel: {
    background: "#fff", border: "1px solid #E2E8F0",
    borderRadius: 16, padding: "32px 32px 28px",
    marginBottom: 10,
  },
  panelTitle: { fontSize: 21, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 4, marginTop: 2 },
  panelSub:   { fontSize: 13, color: "#64748B", marginBottom: 0 },

  loadCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "36px 0" },
  spinRing: {
    width: 52, height: 52, borderRadius: "50%",
    background: "#EFF6FF", color: "#3B82F6",
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },

  errSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "28px 0", textAlign: "center" },
  errIconRing: {
    width: 44, height: 44, borderRadius: "50%",
    background: "#FEF2F2", color: "#EF4444",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  emptyIcon: {
    width: 52, height: 52, borderRadius: "50%",
    background: "#FEF2F2", color: "#EF4444",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: "#0F172A" },
  emptyBody:  { fontSize: 14, color: "#64748B" },

  alertRed: {
    display: "flex", alignItems: "center", gap: 14,
    background: "#FFF1F2", border: "1px solid #FECDD3",
    borderRadius: 12, padding: "16px 18px", marginBottom: 10,
  },
  alertOrange: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#FFF7ED", border: "1px solid #FED7AA",
    borderRadius: 10, padding: "12px 16px",
  },
  alertBtn: {
    padding: "8px 16px", borderRadius: 8, border: "1px solid #FECDD3",
    background: "#fff", color: "#E11D48", fontWeight: 700, fontSize: 13,
    cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
    fontFamily: FF,
  },

  infoBox: {
    background: "#FFFBEB", border: "1px solid #FDE68A",
    borderRadius: 10, padding: "12px 16px", marginTop: 12,
  },
  refNote: {
    fontSize: 13, color: "#475569", lineHeight: 1.6,
    padding: "12px 16px", background: "#F1F5F9",
    borderRadius: 10, marginTop: 12,
  },

  dropZone: {
    border: "2px dashed", borderRadius: 14, padding: "32px 24px",
    cursor: "pointer", transition: "all .2s",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  proofGuide: {
    background: "#F8FAFC", borderRadius: 10,
    padding: "16px 18px", marginTop: 16,
  },
  proofGuideHead: { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 },
  proofGuideList: { paddingLeft: 16, fontSize: 13, color: "#64748B", lineHeight: 2, marginBottom: 8 },
  proofGuideNote: { fontSize: 12, color: "#94A3B8" },

  sessionWarn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#FFF1F2", border: "1px solid #FECDD3",
    borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "#9F1239", marginTop: 12,
  },
  retryInline: {
    background: "none", border: "none", color: "#E11D48",
    fontWeight: 700, fontSize: 13, cursor: "pointer",
    textDecoration: "underline", padding: 0, fontFamily: FF,
  },

  waPanel: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    background: "#F0FDF4", border: "1px solid #BBF7D0",
    borderRadius: 12, padding: "18px 20px", marginBottom: 10,
  },
  waBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 18px", borderRadius: 10,
    background: "#25D366", color: "#fff",
    textDecoration: "none", fontWeight: 700, fontSize: 13,
    flexShrink: 0, transition: "all .2s", fontFamily: FF,
  },

  cancelWrap: {
    background: "#fff", border: "1px solid #E2E8F0",
    borderRadius: 12, padding: "16px 20px",
  },
  cancelLink: {
    background: "none", border: "none",
    color: "#94A3B8", fontSize: 13, cursor: "pointer",
    fontFamily: FF, padding: 0, textDecoration: "none",
    transition: "color .15s",
  },
  cancelTA: {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid #E2E8F0", fontSize: 14, fontFamily: FF,
    resize: "vertical", color: "#0F172A", outline: "none", lineHeight: 1.6,
  },

  successWrap: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingBottom: 24, gap: 8 },
  successRing: {
    width: 64, height: 64, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 28, animation: "kpop .4s ease",
  },
  successBody: { fontSize: 14, color: "#64748B", lineHeight: 1.7, maxWidth: 360 },
  doneLinks: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 280, margin: "0 auto 16px", alignItems: "stretch" },
  timeline: {
    background: "#fff", border: "1px solid #E2E8F0",
    borderRadius: 12, padding: "20px 24px",
  },
  timelineHead: { fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 },

  primaryBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "13px 24px", borderRadius: 10,
    background: "#1E3A8A", color: "#fff",
    border: "none", fontWeight: 700, fontSize: 14, fontFamily: FF,
    cursor: "pointer", transition: "all .2s",
    boxShadow: "0 2px 10px rgba(30,58,138,.28)",
  },
  ghostBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "12px 20px", borderRadius: 10,
    border: "1px solid #E2E8F0", background: "transparent",
    color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF,
    cursor: "pointer", transition: "all .15s",
  },
  dangerBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "11px 20px", borderRadius: 10,
    border: "none", background: "#DC2626", color: "#fff",
    fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer",
    transition: "all .2s",
  },
  primaryLink: {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "13px 24px", borderRadius: 10,
    background: "#1E3A8A", color: "#fff",
    textDecoration: "none", fontWeight: 700, fontSize: 14, fontFamily: FF,
    boxShadow: "0 2px 10px rgba(30,58,138,.28)",
    transition: "all .2s",
  },
  ghostLink: {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "12px 20px", borderRadius: 10,
    border: "1px solid #E2E8F0", background: "transparent",
    color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 13, fontFamily: FF,
  },
  textBtn: {
    display: "block", background: "none", border: "none",
    color: "#94A3B8", fontSize: 13, cursor: "pointer",
    textDecoration: "underline", fontFamily: FF, margin: "12px auto 0", padding: 0,
  },
  actions: { display: "flex", alignItems: "center", gap: 12, marginTop: 24, flexWrap: "wrap" },
};