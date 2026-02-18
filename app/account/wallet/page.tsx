"use client";

import { useEffect, useState } from "react";
import { walletApi } from "@/lib/api";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try {
      const [w, t] = await Promise.allSettled([walletApi.get(), walletApi.getTransactions()]);
      if (w.status === "fulfilled") setWallet(w.value);
      if (t.status === "fulfilled") setTransactions((t.value as any) ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); }

  async function redeem() {
    if (!points || isNaN(Number(points))) return;
    setRedeeming(true);
    try { await walletApi.redeemPoints(Number(points)); setPoints(""); load(); flash("Points redeemed successfully!"); }
    catch (e: any) { flash(e?.message ?? "Redemption failed", false); }
    finally { setRedeeming(false); }
  }

  if (loading) return <div style={{ color: "#64748b" }}>Loading wallet...</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24 }}>Wallet & Loyalty</h1>

      {msg && <div style={{ ...banner, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b", marginBottom: 16 }}>{msg.text}</div>}

      {/* BALANCE */}
      <div style={{ ...card, background: "linear-gradient(135deg,#0033a0,#009543)", color: "#fff", marginBottom: 16 }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>Available Balance</div>
        <div style={{ fontSize: 36, fontWeight: 900 }}>R {Number(wallet?.balance ?? 0).toLocaleString()}</div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
          Loyalty Points: <strong>{Number(wallet?.points ?? 0).toLocaleString()} pts</strong>
        </div>
      </div>

      {/* REDEEM POINTS */}
      {(wallet?.points ?? 0) > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={sectionTitle}>Redeem Points</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input type="number" placeholder={`Max ${wallet?.points ?? 0} pts`} value={points} onChange={(e) => setPoints(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, width: 160 }} />
            <button onClick={redeem} disabled={redeeming || !points} style={greenBtn}>
              {redeeming ? "Redeeming..." : "Redeem"}
            </button>
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      <div style={card}>
        <h3 style={sectionTitle}>Transaction History</h3>
        {transactions.length === 0 ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0", fontSize: 14 }}>No transactions yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {transactions.map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.description ?? t.type ?? "Transaction"}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ""}</div>
                </div>
                <div style={{ fontWeight: 800, color: (t.amount ?? 0) >= 0 ? "#166534" : "#dc2626" }}>
                  {(t.amount ?? 0) >= 0 ? "+" : ""}R {Number(Math.abs(t.amount ?? 0)).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#0f172a" };
const greenBtn: React.CSSProperties = { padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0033a0,#009543)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const banner: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid", fontSize: 14 };