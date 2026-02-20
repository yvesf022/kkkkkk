"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { paymentsApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import type { BankSettings, Payment } from "@/lib/types";

const FF = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0F172A";
const ACCENT = "#1E3A8A";
const POLL_MS = 30_000;

const SpinnerSVG = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ animation: "kspin 0.7s linear infinite" }}>
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity=".15"/>
    <path d="M10 2a8 8 0 018 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const CheckSVG = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CopySVG = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const UploadSVG = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 16V7M12 7l-4 4M12 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 17v1.5A2.5 2.5 0 005.5 21h13a2.5 2.5 0 002.5-2.5V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const ClockSVG = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const WarnSVG = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8" cy="11" r=".7" fill="currentColor"/>
  </svg>
);
const FileSVG = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M11 2H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V8l-5-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M11 2v6h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

const STATUS_META: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  pending:  { bg: "#FFFBEB", fg: "#92400E", dot: "#F59E0B", label: "Pending" },
  on_hold:  { bg: "#FFF7ED", fg: "#7C3D0A", dot: "#F97316", label: "Under Review" },
  paid:     { bg: "#F0FDF4", fg: "#065F46", dot: "#10B981", label: "Paid" },
  rejected: { bg: "#FFF1F2", fg: "#9F1239", dot: "#F43F5E", label: "Rejected" },
};

const NAV_STEPS = ["Initialize", "Transfer Funds", "Upload Proof", "Complete"];

export default function PaymentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const clearCart = useCart((s) => s.clearCart);

  const [payment, setPayment]               = useState<Payment | null>(null);
  const [bankDetails, setBankDetails]       = useState<BankSettings | null>(null);
  const [initializing, setInitializing]     = useState(true);
  const [initError, setInitError]           = useState<string | null>(null);
  const [file, setFile]                     = useState<File | null>(null);
  const [dragOver, setDragOver]             = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploaded, setUploaded]             = useState(false);
  const [step, setStep]                     = useState<1 | 2 | 3 | 4>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [cancelling, setCancelling]         = useState(false);
  const [cancelReason, setCancelReason]     = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [retrying, setRetrying]             = useState(false);
  const [copied, setCopied]                 = useState<string | null>(null);
  const [polling, setPolling]               = useState(false);
  const [uploadError, setUploadError]       = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    paymentsApi.getBankDetails()
      .then((b: any) => setBankDetails(Array.isArray(b) ? b[0] : b))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const key = `cart_cleared_${orderId}`;
    if (orderId && !sessionStorage.getItem(key)) {
      clearCart().catch(() => {});
      sessionStorage.setItem(key, "1");
    }
  }, [orderId, clearCart]);

  useEffect(() => {
    if (step === 4 && payment?.status === "on_hold" && payment?.id) {
      pollRef.current = setInterval(async () => {
        setPolling(true);
        try {
          const updated = await paymentsApi.getById(payment.id) as Payment;
          setPayment(updated);
          if (updated.status !== "on_hold") clearInterval(pollRef.current!);
        } finally { setPolling(false); }
      }, POLL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, payment?.status, payment?.id]);

  const initPayment = useCallback(async () => {
    if (!orderId) { setInitError("No order ID"); setInitializing(false); return; }
    setInitializing(true); setInitError(null);
    try {
      let pmt: Payment | null = await paymentsApi.getByOrderId(orderId);
      if (!pmt) pmt = await paymentsApi.create(orderId);
      setPayment(pmt);
      if (pmt.status === "paid") {
        setStep(4); setCompletedSteps(new Set([1, 2, 3, 4]));
      } else if (pmt.status === "on_hold") {
        setStep(4); setCompletedSteps(new Set([1, 2, 3]));
      } else {
        setStep(2); setCompletedSteps(new Set([1]));
      }
    } catch (e: any) {
      setInitError(e.message ?? "Could not initialize payment");
    } finally { setInitializing(false); }
  }, [orderId]);

  useEffect(() => { initPayment(); }, [initPayment]);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(null), 2200);
    });
  }

  async function handleUpload() {
    if (!file || !payment) return;
    setUploading(true); setUploadError(null);
    try {
      await paymentsApi.uploadProof(payment.id, file);
      setUploaded(true); setFile(null);
      setCompletedSteps(prev => new Set([...prev, 2, 3]));
      const updated = await paymentsApi.getById(payment.id) as Payment;
      setPayment(updated);
      setTimeout(() => setStep(4), 700);
    } catch (e: any) {
      setUploadError(e.message ?? "Upload failed. Please try again.");
    } finally { setUploading(false); }
  }

  async function handleCancel() {
    if (!payment || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await paymentsApi.cancel(payment.id, cancelReason);
      router.push(`/account/orders/${orderId}`);
    } catch (e: any) {
      alert(e.message ?? "Cancel failed");
      setCancelling(false);
    }
  }

  async function handleRetry() {
    if (!orderId) return;
    setRetrying(true);
    try {
      const newPmt = await paymentsApi.retry(orderId) as Payment;
      setPayment(newPmt);
      setCompletedSteps(new Set([1]));
      setUploaded(false); setFile(null);
      setStep(2);
    } catch (e: any) {
      alert(e.message ?? "Retry failed");
    } finally { setRetrying(false); }
  }

  function CopyBtn({ value, copyKey, small }: { value: string; copyKey: string; small?: boolean }) {
    const isCopied = copied === copyKey;
    return (
      <button
        onClick={() => copyText(value, copyKey)}
        style={{
          padding: small ? "3px 8px" : "5px 10px", borderRadius: 6,
          border: "1px solid #E2E8F0", background: "#fff",
          color: isCopied ? "#10B981" : "#64748B",
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 600, fontFamily: FF,
          transition: "all .15s",
        }}
      >
        {isCopied ? <CheckSVG /> : <CopySVG />}
        {isCopied ? "Copied!" : "Copy"}
      </button>
    );
  }

  if (!orderId) return (
    <div style={S.page}>
      <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h2 style={S.cardTitle}>No Order Found</h2>
        <p style={S.cardSub}>Please start checkout from your cart.</p>
        <Link href="/store/cart" style={S.primaryLink}>Go to Cart</Link>
      </div>
    </div>
  );

  if (initializing) return (
    <div style={S.page}>
      <style>{`@keyframes kspin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ ...S.card, padding: "56px 32px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: ACCENT }}>
          <SpinnerSVG />
        </div>
        <h2 style={S.cardTitle}>Setting up your payment…</h2>
        <p style={S.cardSub}>Loading your secure payment session.</p>
      </div>
    </div>
  );

  if (initError || !payment) return (
    <div style={S.page}>
      <div style={{ ...S.card, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <h2 style={S.cardTitle}>Payment Setup Failed</h2>
        <p style={S.cardSub}>{initError}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={initPayment} style={S.primaryBtn} className="kbtn">Try Again</button>
          <Link href={`/account/orders/${orderId}`} style={S.ghostLink}>View Order</Link>
        </div>
      </div>
    </div>
  );

  const pmt = payment;
  const pMeta = STATUS_META[pmt.status] ?? STATUS_META.pending;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes kspin { to { transform: rotate(360deg); } }
        @keyframes kfade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes kpop { 0%{transform:scale(.6);opacity:0;} 70%{transform:scale(1.1);} 100%{transform:scale(1);opacity:1;} }
        * { box-sizing: border-box; }
        .kbtn:hover { opacity: .85; }
        .kghst:hover { background: #F1F5F9 !important; }
      `}</style>

      {/* Step Nav */}
      <div style={S.stepNav}>
        {NAV_STEPS.map((label, i) => {
          const n = i + 1;
          const done = completedSteps.has(n);
          const active = step === n;
          return (
            <div key={n} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 13,
                  background: done ? ACCENT : active ? "#EFF6FF" : "#F1F5F9",
                  color: done ? "#fff" : active ? ACCENT : "#94A3B8",
                  border: active ? `2.5px solid ${ACCENT}` : "2.5px solid transparent",
                  transition: "all .3s",
                }}>
                  {done ? <CheckSVG /> : n}
                </div>
                <span style={{ fontSize: 11, color: active ? ACCENT : done ? BRAND : "#94A3B8", fontWeight: active || done ? 700 : 400, marginTop: 6, textAlign: "center" }}>{label}</span>
              </div>
              {i < NAV_STEPS.length - 1 && (
                <div style={{ width: 36, height: 2, background: completedSteps.has(n) ? ACCENT : "#E2E8F0", margin: "0 4px 20px", transition: "background .3s", flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={S.layout}>
        <div style={{ animation: "kfade .35s ease" }}>

          {/* Status Banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: pMeta.bg, marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: pMeta.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: pMeta.fg }}>{pMeta.label}</span>
            {polling && <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 4 }}><SpinnerSVG /> Checking…</span>}
            <span style={{ marginLeft: polling ? 0 : "auto", fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>#{pmt.id.slice(0, 8)}</span>
          </div>

          {/* Rejected Alert */}
          {pmt.status === "rejected" && (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ color: "#E11D48", flexShrink: 0, marginTop: 2 }}><WarnSVG /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#9F1239", fontSize: 14, margin: "0 0 4px" }}>Payment Rejected</p>
                {pmt.admin_notes && <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 12px" }}>{pmt.admin_notes}</p>}
                <button onClick={handleRetry} disabled={retrying} className="kbtn" style={{ ...S.primaryBtn, fontSize: 13, padding: "10px 18px" }}>
                  {retrying ? <SpinnerSVG /> : "↺ Start New Payment"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Transfer Funds */}
          {step === 2 && pmt.status !== "rejected" && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Transfer Funds</h2>
              <p style={S.cardSub}>Send exactly <strong style={{ color: BRAND }}>{formatCurrency(pmt.amount)}</strong> to the account below.</p>

              {bankDetails ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                    <div style={{ background: "#EFF6FF", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: BRAND }}>{bankDetails.bank_name}</span>
                    </div>
                    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                      {[
                        { label: "Account Name", value: bankDetails.account_name },
                        { label: "Account Number", value: bankDetails.account_number, copyKey: "acct" },
                        { label: "Branch", value: bankDetails.branch },
                        { label: "SWIFT/BIC", value: bankDetails.swift_code, copyKey: "swift" },
                      ].filter(r => r.value).map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>{row.label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, color: BRAND, fontSize: 14, fontFamily: row.copyKey ? "monospace" : "inherit" }}>{row.value}</span>
                            {row.copyKey && <CopyBtn value={row.value!} copyKey={row.copyKey} small />}
                          </div>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Transfer Amount</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: BRAND }}>{formatCurrency(pmt.amount)}</span>
                          <CopyBtn value={pmt.amount.toString()} copyKey="amount" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {(bankDetails.mobile_money_number || bankDetails.mobile_money_provider) && (
                    <div style={{ marginTop: 14, padding: "14px 18px", background: "#F0FDF4", borderRadius: 12, border: "1px solid #BBF7D0" }}>
                      <p style={{ fontWeight: 700, color: "#065F46", fontSize: 13, margin: "0 0 8px" }}>Mobile Money Option</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          {bankDetails.mobile_money_provider && <p style={{ fontSize: 13, color: "#475569", margin: "0 0 2px" }}>{bankDetails.mobile_money_provider}</p>}
                          {bankDetails.mobile_money_number && <p style={{ fontFamily: "monospace", fontWeight: 800, color: BRAND, fontSize: 16, margin: "0 0 2px" }}>{bankDetails.mobile_money_number}</p>}
                          {bankDetails.mobile_money_name && <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>{bankDetails.mobile_money_name}</p>}
                        </div>
                        {bankDetails.mobile_money_number && <CopyBtn value={bankDetails.mobile_money_number} copyKey="momo" />}
                      </div>
                    </div>
                  )}

                  {bankDetails.qr_code_url && (
                    <div style={{ marginTop: 14, textAlign: "center" }}>
                      <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8, fontWeight: 600 }}>Scan QR to pay</p>
                      <img src={bankDetails.qr_code_url} alt="QR" style={{ width: 130, height: 130, borderRadius: 10, border: "1px solid #E2E8F0" }} />
                    </div>
                  )}

                  {bankDetails.instructions && (
                    <div style={{ marginTop: 14, padding: "12px 16px", background: "#FFFBEB", borderRadius: 10, border: "1px solid #FDE68A" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", margin: "0 0 4px" }}>Payment Instructions</p>
                      <p style={{ fontSize: 13, color: "#78350F", margin: 0, lineHeight: 1.7 }}>{bankDetails.instructions}</p>
                    </div>
                  )}

                  <div style={{ marginTop: 14, padding: "12px 16px", background: "#F8FAFC", borderRadius: 10 }}>
                    <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.8 }}>
                      📋 After transferring, click below to upload your receipt or screenshot as proof of payment.
                    </p>
                  </div>

                  <button
                    onClick={() => { setCompletedSteps(prev => new Set([...prev, 2])); setStep(3); }}
                    className="kbtn"
                    style={{ ...S.primaryBtn, width: "100%", marginTop: 18, justifyContent: "center", display: "flex" }}
                  >
                    I've Transferred — Upload Proof →
                  </button>
                </div>
              ) : (
                <div style={{ padding: "28px 0", textAlign: "center", color: "#94A3B8" }}>
                  <SpinnerSVG /> &nbsp;Loading bank details…
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Upload Proof */}
          {step === 3 && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Upload Proof of Payment</h2>
              <p style={S.cardSub}>Upload a screenshot or photo of your payment confirmation.</p>

              {!uploaded ? (
                <>
                  {uploadError && (
                    <div style={{ padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, marginTop: 16, color: "#9F1239", fontSize: 13, fontWeight: 600 }}>
                      ⚠ {uploadError}
                    </div>
                  )}
                  <div
                    style={{
                      border: `2px dashed ${dragOver ? ACCENT : "#E2E8F0"}`,
                      borderRadius: 14, padding: "36px 24px",
                      cursor: "pointer", transition: "all .2s",
                      background: dragOver ? "#EFF6FF" : "#FAFAFA",
                      textAlign: "center", marginTop: 20,
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setDragOver(false);
                      const f = e.dataTransfer.files[0];
                      if (f) setFile(f);
                    }}
                  >
                    {file ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                        <div style={{ color: ACCENT }}><FileSVG /></div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: 0 }}>{file.name}</p>
                          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 20 }}>×</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ color: "#94A3B8", marginBottom: 10 }}><UploadSVG /></div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#64748B", margin: "0 0 4px" }}>
                          Drop your file here, or click to browse
                        </p>
                        <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>PNG, JPG, PDF · Max 10MB</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: "none" }}
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />

                  <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>What to include:</p>
                    <ul style={{ paddingLeft: 16, fontSize: 13, color: "#64748B", lineHeight: 2, margin: 0 }}>
                      <li>Transfer amount ({formatCurrency(pmt.amount)})</li>
                      <li>Bank reference or transaction ID</li>
                      <li>Date and time of transfer</li>
                      <li>Sender account info</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="kbtn"
                    style={{ ...S.primaryBtn, width: "100%", marginTop: 16, justifyContent: "center", display: "flex", opacity: (!file || uploading) ? 0.6 : 1 }}
                  >
                    {uploading ? <><SpinnerSVG /> &nbsp;Uploading…</> : "Submit Proof of Payment →"}
                  </button>

                  <button
                    onClick={() => setStep(2)}
                    className="kghst"
                    style={{ ...S.ghostBtn, width: "100%", marginTop: 10, justifyContent: "center", display: "flex" }}
                  >
                    ← Back to Bank Details
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 52, marginBottom: 10, animation: "kpop .4s ease" }}>✅</div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#065F46" }}>Proof uploaded successfully!</p>
                  <p style={{ fontSize: 13, color: "#64748B" }}>Moving to confirmation…</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Complete */}
          {step === 4 && (
            <div style={S.card}>
              {pmt.status === "paid" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingBottom: 8 }}>
                  <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, marginBottom: 16, animation: "kpop .45s ease" }}>✅</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#065F46", margin: "0 0 8px" }}>Payment Confirmed!</h2>
                  <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 24, maxWidth: 340 }}>
                    Your payment of <strong>{formatCurrency(pmt.amount)}</strong> has been confirmed. Your order is being processed.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
                    <Link href={`/account/orders/${orderId}`} style={{ ...S.primaryLink, justifyContent: "center", display: "flex" }}>View My Order →</Link>
                    <Link href="/store" style={{ ...S.ghostLink, justifyContent: "center", display: "flex" }}>Continue Shopping</Link>
                  </div>
                </div>
              ) : pmt.status === "rejected" ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#9F1239", margin: "0 0 8px" }}>Payment Rejected</h2>
                  {pmt.admin_notes && <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>{pmt.admin_notes}</p>}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={handleRetry} disabled={retrying} className="kbtn" style={S.primaryBtn}>
                      {retrying ? <SpinnerSVG /> : "↺ Retry Payment"}
                    </button>
                    <Link href={`/account/orders/${orderId}`} style={S.ghostLink}>View Order</Link>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, marginBottom: 14, animation: "kpop .4s ease" }}>⏳</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#7C3D0A", margin: "0 0 8px" }}>Proof Under Review</h2>
                  <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 8, maxWidth: 360 }}>
                    Your proof of payment has been submitted and is being reviewed. You&apos;ll be notified once confirmed — usually within a few hours.
                  </p>
                  <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 22, display: "flex", alignItems: "center", gap: 5 }}>
                    <ClockSVG /> This page auto-checks every 30 seconds
                  </p>
                  <div style={{ width: "100%", background: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
                    {[
                      { label: "Payment initialized", done: true },
                      { label: "Transfer completed", done: true },
                      { label: "Proof uploaded", done: true },
                      { label: "Admin review", active: true },
                      { label: "Order confirmed", done: false },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i < 4 ? 10 : 0, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: item.done ? "#10B981" : item.active ? "#F97316" : "#E2E8F0" }} />
                        <span style={{ fontSize: 13, color: item.done ? BRAND : item.active ? "#7C3D0A" : "#94A3B8", fontWeight: (item.done || item.active) ? 600 : 400 }}>
                          {item.label}
                        </span>
                        {item.active && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: "#F97316", textTransform: "uppercase" }}>In Progress</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
                    <Link href={`/account/orders/${orderId}`} style={{ ...S.primaryLink, justifyContent: "center", display: "flex" }}>View Order Status →</Link>
                    <Link href="/store" style={{ ...S.ghostLink, justifyContent: "center", display: "flex" }}>Continue Shopping</Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancel Section */}
          {["pending"].includes(pmt.status) && step === 2 && (
            <div style={{ marginTop: 12, borderRadius: 12, border: "1px solid #E2E8F0", padding: "14px 18px", background: "#fff" }}>
              {!showCancelForm ? (
                <button onClick={() => setShowCancelForm(true)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 13, cursor: "pointer", fontFamily: FF, padding: 0 }}>
                  Cancel this payment
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#9F1239", margin: "0 0 8px" }}>Cancel Payment?</p>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation…"
                    rows={3}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: FF, resize: "vertical", outline: "none" }}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button onClick={handleCancel} disabled={cancelling || !cancelReason.trim()} className="kbtn"
                      style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: FF, cursor: "pointer" }}>
                      {cancelling ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                    <button onClick={() => setShowCancelForm(false)} className="kghst" style={S.ghostBtn}>Keep</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={S.sidebar}>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 14px" }}>Order Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B" }}>
                <span>Order</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: BRAND }}>#{orderId?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B" }}>
                <span>Payment</span>
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>{pmt.id.slice(0, 10)}…</span>
              </div>
              <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, color: BRAND, fontSize: 15 }}>Total Due</span>
                <span style={{ fontWeight: 800, color: BRAND, fontSize: 15 }}>{formatCurrency(pmt.amount)}</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, padding: "12px 16px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, lineHeight: 1.8 }}>
              🔒 Secure payment. Contact support if you need help completing your payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 960, margin: "0 auto", padding: "24px 20px 56px", fontFamily: FF },
  layout: { display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" },
  stepNav: { display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0, marginBottom: 24, overflowX: "auto", paddingBottom: 4 },
  sidebar: {},
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "28px 28px 24px" },
  cardTitle: { fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", margin: "0 0 6px" },
  cardSub: { fontSize: 14, color: "#64748B", margin: "0 0 4px", lineHeight: 1.6 },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", fontWeight: 800, fontSize: 14, fontFamily: FF, cursor: "pointer", boxShadow: "0 2px 10px rgba(30,58,138,.28)" },
  primaryLink: { display: "flex", alignItems: "center", padding: "13px 22px", borderRadius: 10, background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14, fontFamily: FF, boxShadow: "0 2px 10px rgba(30,58,138,.28)" },
  ghostBtn: { display: "inline-flex", alignItems: "center", padding: "11px 18px", borderRadius: 10, border: "1px solid #E2E8F0", background: "transparent", color: "#475569", fontWeight: 600, fontSize: 13, fontFamily: FF, cursor: "pointer" },
  ghostLink: { display: "flex", alignItems: "center", padding: "12px 20px", borderRadius: 10, border: "1px solid #E2E8F0", background: "transparent", color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 13, fontFamily: FF },
};