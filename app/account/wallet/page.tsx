"use client";

import { useEffect, useState } from "react";
import { walletApi } from "@/lib/api";
import type { Wallet, WalletTransaction } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

const txTypeConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  earn:       { label: "Earned",   color: "#166534", bg: "#dcfce7", icon: "+" },
  redeem:     { label: "Redeemed", color: "#1e40af", bg: "#dbeafe", icon: "−" },
  refund:     { label: "Refund",   color: "#166534", bg: "#dcfce7", icon: "+" },
  adjustment: { label: "Adjusted", color: "#475569", bg: "#f1f5f9", icon: "±" },
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try {
      const [w, t] = await Promise.allSettled([
        walletApi.get(),
        walletApi.getTransactions(50),
      ]);
      if (w.status === "fulfilled") setWallet(w.value as Wallet);
      if (t.status === "fulfilled") setTransactions((t.value as any) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); }

  async function handleRedeem() {
    const pts = Number(points);
    if (!pts || isNaN(pts) || pts <= 0) return;
    if (wallet && pts > wallet.balance) {
      flash("Not enough points", false);
      return;
    }
    setRedeeming(true);
    try {
      await walletApi.redeemPoints(pts);
      setPoints("");
      load();
      flash(`${pts.toLocaleString()} points redeemed successfully! (${formatCurrency(pts)} credited to your account)`);
    } catch (e: any) {
      flash(e?.message ?? "Redemption failed", false);
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) return <div style={{ color: "#64748b" }}>Loading wallet...</div>;

  const earnTotal = transactions.filter(t => t.type === "earn" || t.type === "refund").reduce((s, t) => s + (t.points || 0), 0);
  const redeemTotal = transactions.filter(t => t.type === "redeem").reduce((s, t) => s + Math.abs(t.points || 0), 0);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 24px" }}>Wallet & Loyalty</h1>

      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid", fontSize: 14, marginBottom: 20, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b" }}>
          {msg.text}
        </div>
      )}

      {/* BALANCE HERO CARD */}
      <div style={{ background: "linear-gradient(135deg, #0033a0 0%, #009543 100%)", borderRadius: 20, padding: 28, color: "#fff", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: -30, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />

        <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Loyalty Points Balance
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>
          {Number(wallet?.balance ?? 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          Points · Worth {formatCurrency(wallet?.balance ?? 0)}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 24, marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 20 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Lifetime Earned</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{Number(wallet?.lifetime_earned ?? 0).toLocaleString()} pts</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Lifetime Redeemed</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{Number(wallet?.lifetime_redeemed ?? 0).toLocaleString()} pts</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Total Transactions</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{transactions.length}</div>
          </div>
        </div>
      </div>

      {/* HOW TO EARN */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: "#0f172a" }}>How to Earn Points</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {[
            { icon: "🛒", label: "Make a purchase", pts: "1pt per R1" },
            { icon: "⭐", label: "Write a review", pts: "50 pts" },
            { icon: "👤", label: "Complete profile", pts: "100 pts" },
            { icon: "📦", label: "First order", pts: "200 pts" },
          ].map((item) => (
            <div key={item.label} style={{ padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #f1f5f9", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "#009543", fontWeight: 700 }}>{item.pts}</div>
            </div>
          ))}
        </div>
      </div>

      {/* REDEEM FORM */}
      {(wallet?.balance ?? 0) > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: "#0f172a" }}>Redeem Points</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            Use your points as cash at checkout. 1 point = R1.
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
              <input
                type="number"
                min={1}
                max={wallet?.balance ?? 0}
                placeholder={`Enter points (max ${wallet?.balance ?? 0})`}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }}
                onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              />
            </div>
            <button
              onClick={handleRedeem}
              disabled={redeeming || !points || Number(points) <= 0}
              style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#0033a0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: (!points || redeeming) ? 0.6 : 1 }}
            >
              {redeeming ? "Redeeming..." : "Redeem"}
            </button>
            {points && Number(points) > 0 && (
              <div style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>
                = {formatCurrency(Number(points))} off
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Transaction History</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{transactions.length} entries</div>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
            <div>No transactions yet.</div>
          </div>
        ) : (
          <div>
            {transactions.map((t, i) => {
              const cfg = txTypeConfig[t.type] ?? txTypeConfig.adjustment;
              const isPositive = t.type === "earn" || t.type === "refund";
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
                    borderBottom: i < transactions.length - 1 ? "1px solid #f8fafc" : "none",
                  }}
                >
                  {/* Icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {t.description ?? cfg.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {new Date(t.created_at).toLocaleString()}
                      {t.reference_type && ` · ${t.reference_type}`}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: isPositive ? "#166534" : "#dc2626" }}>
                      {isPositive ? "+" : "−"}{Math.abs(t.points).toLocaleString()} pts
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      Balance: {t.balance_after.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}