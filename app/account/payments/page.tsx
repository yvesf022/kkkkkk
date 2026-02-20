"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { paymentsApi } from "@/lib/api";

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try {
      const [p, b] = await Promise.allSettled([paymentsApi.getMy(), paymentsApi.getBankDetails()]);
      if (p.status === "fulfilled") {
        // FIX #3: API may return { payments: [] } or { results: [] } instead of a plain array
        const val = p.value as any;
        setPayments(Array.isArray(val) ? val : val?.payments ?? val?.results ?? []);
      }
      if (b.status === "fulfilled") setBankDetails(b.value);
    } finally { setLoading(false); }
  }

  async function selectPayment(p: any) {
    setSelected(p);
    try {
      const h = await paymentsApi.getStatusHistory(p.id);
      // FIX: history may also be wrapped
      const hVal = h as any;
      setHistory(Array.isArray(hVal) ? hVal : hVal?.history ?? hVal?.results ?? []);
    } catch { setHistory([]); }
  }

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); }

  async function act(fn: () => Promise<any>, successMsg: string) {
    setActionLoading(true);
    try { await fn(); flash(successMsg); load(); setSelected(null); }
    catch (e: any) { flash(e?.message ?? "Action failed", false); }
    finally { setActionLoading(false); }
  }

  async function handleUploadProof() {
    if (!proofFile || !selected) return;
    act(() => paymentsApi.uploadProof(selected.id, proofFile), "Proof uploaded!");
    setProofFile(null);
  }

  async function handleResubmit() {
    if (!proofFile || !selected) return;
    act(() => paymentsApi.resubmitProof(selected.id, proofFile), "Proof resubmitted!");
    setProofFile(null);
  }

  async function handleCancel() {
    if (!selected || !confirm("Cancel this payment?")) return;
    act(() => paymentsApi.cancel(selected.id, "Customer cancelled"), "Payment cancelled.");
  }

  async function handleRetry() {
    if (!selected) return;
    act(() => paymentsApi.retry(selected.order_id), "Payment retried — check your orders.");
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ color: "#64748b", padding: 20 }}>Loading payments...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>My Payments</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>View and manage all your payments.</p>
      </div>

      {msg && <div style={{ ...banner, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b", marginBottom: 16 }}>{msg.text}</div>}

      {/* BANK DETAILS */}
      {bankDetails && (
        <div style={{ ...card, background: "#f0fdf4", borderColor: "#bbf7d0", marginBottom: 20 }}>
          <h3 style={{ ...sectionTitle, color: "#166534" }}>Bank Details for Payment</h3>
          {Object.entries(bankDetails).filter(([k]) => !["id", "created_at"].includes(k)).map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 12, fontSize: 14, marginBottom: 6 }}>
              <span style={{ color: "#64748b", textTransform: "capitalize", minWidth: 120 }}>{k.replace(/_/g, " ")}:</span>
              <strong>{String(v)}</strong>
            </div>
          ))}
        </div>
      )}

      {/* PAYMENTS LIST */}
      {payments.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#64748b", padding: 40 }}>No payments yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          {payments.map((p: any) => (
            <div key={p.id} onClick={() => selectPayment(p)}
              style={{ ...card, cursor: "pointer", borderColor: selected?.id === p.id ? "#3b82f6" : "#e2e8f0", background: selected?.id === p.id ? "#eff6ff" : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>#{p.id?.slice(0, 8)}</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>R {Number(p.amount ?? 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SELECTED PAYMENT DETAIL */}
      {selected && (
        <div style={card}>
          <h3 style={sectionTitle}>Payment #{selected.id?.slice(0, 8)}</h3>

          {history.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>Status History</div>
              {history.map((h: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? "#3b82f6" : "#cbd5e1", marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 600 }}>{h.status}</span>
                    {h.note && <span style={{ color: "#64748b" }}> — {h.note}</span>}
                    <div style={{ color: "#94a3b8", fontSize: 11 }}>{h.created_at ? new Date(h.created_at).toLocaleString() : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gap: 14 }}>
            {["pending", "on_hold"].includes(selected.status) && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#0f172a" }}>
                  {selected.status === "on_hold" ? "Resubmit Payment Proof" : "Upload Payment Proof"}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
                  {selected.status === "on_hold"
                    ? <button onClick={handleResubmit} disabled={!proofFile || actionLoading} style={greenBtn}>Resubmit Proof</button>
                    : <button onClick={handleUploadProof} disabled={!proofFile || actionLoading} style={greenBtn}>Upload Proof</button>
                  }
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {selected.status === "pending" && (
                <button onClick={handleCancel} disabled={actionLoading} style={{ ...btn, color: "#dc2626", borderColor: "#fca5a5" }}>Cancel Payment</button>
              )}
              {selected.status === "rejected" && (
                <button onClick={handleRetry} disabled={actionLoading} style={greenBtn}>Retry Payment</button>
              )}
              <button onClick={() => router.push(`/account/orders/${selected.order_id}`)} style={btn}>View Order</button>
              <button onClick={() => setSelected(null)} style={btn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ["#fef9c3", "#854d0e"], paid: ["#dcfce7", "#166534"],
    on_hold: ["#fef3c7", "#92400e"], rejected: ["#fee2e2", "#991b1b"],
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", "#475569"];
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: bg, color }}>{status}</span>;
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" };
const btn: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13 };
const greenBtn: React.CSSProperties = { ...btn, background: "#dcfce7", borderColor: "#86efac", fontWeight: 600, color: "#166534" };
const banner: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid", fontSize: 14 };