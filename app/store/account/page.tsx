"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/Motion";

type Tab = "profile" | "orders" | "addresses" | "settings";

const demoOrders = [
  {
    id: "KY-2026-00192",
    date: "Jan 22, 2026",
    status: "Delivered",
    items: 3,
    total: 4897,
  },
  {
    id: "KY-2026-00177",
    date: "Jan 18, 2026",
    status: "Shipped",
    items: 1,
    total: 1299,
  },
  {
    id: "KY-2026-00144",
    date: "Jan 11, 2026",
    status: "Processing",
    items: 2,
    total: 3198,
  },
] as const;

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="pill"
      onClick={onClick}
      style={{
        cursor: "pointer",
        fontWeight: 1000,
        borderColor: active ? "rgba(73,215,255,0.55)" : "rgba(73,215,255,0.18)",
        background: active ? "rgba(73,215,255,0.12)" : "rgba(10,24,54,0.55)",
        boxShadow: active ? "0 0 26px rgba(73,215,255,0.2)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "Delivered"
      ? { borderColor: "rgba(73,215,255,0.35)", background: "rgba(73,215,255,0.10)" }
      : status === "Shipped"
      ? { borderColor: "rgba(255,77,243,0.25)", background: "rgba(255,77,243,0.08)" }
      : { borderColor: "rgba(234,246,255,0.18)", background: "rgba(234,246,255,0.06)" };

  return (
    <span className="badge" style={{ ...style, fontWeight: 1000 }}>
      {status}
    </span>
  );
}

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>("orders");

  const title = useMemo(() => {
    if (tab === "profile") return "Profile";
    if (tab === "orders") return "Orders";
    if (tab === "addresses") return "Addresses";
    return "Settings";
  }, [tab]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <FadeIn>
        <div className="glass neon-border" style={{ padding: 16 }}>
          <div className="neon-text" style={{ fontSize: 22, fontWeight: 1000 }}>
            Account
          </div>
          <div style={{ marginTop: 6, color: "rgba(234,246,255,0.72)", fontSize: 13 }}>
            Manage profile, orders, addresses, and settings.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <TabButton label="Orders" active={tab === "orders"} onClick={() => setTab("orders")} />
            <TabButton label="Profile" active={tab === "profile"} onClick={() => setTab("profile")} />
            <TabButton label="Addresses" active={tab === "addresses"} onClick={() => setTab("addresses")} />
            <TabButton label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="glass neon-border" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 1000, fontSize: 16 }}>{title}</div>
            <Link className="btn btnPrimary" href="/store">
              Continue Shopping →
            </Link>
          </div>

          <div className="hr" style={{ margin: "14px 0" }} />

          {/* Orders */}
          {tab === "orders" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {demoOrders.map((o) => (
                <div
                  key={o.id}
                  className="glass"
                  style={{
                    padding: 14,
                    borderRadius: 22,
                    border: "1px solid rgba(73,215,255,0.14)",
                    background:
                      "radial-gradient(900px 260px at 25% 20%, rgba(73,215,255,0.12), transparent 60%), rgba(14,24,55,0.55)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 1000 }}>{o.id}</div>
                      <div style={{ marginTop: 6, color: "rgba(234,246,255,0.72)", fontSize: 13 }}>
                        {o.date} • {o.items} items
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <StatusBadge status={o.status} />
                      <div style={{ fontWeight: 1000 }}>₹ {o.total}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn">Track</button>
                    <button className="btn">Invoice</button>
                    <button className="btn" style={{ borderColor: "rgba(255,77,243,0.22)" }}>
                      Support
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Profile */}
          {tab === "profile" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <input className="pill" placeholder="Full Name" style={{ outline: "none", color: "white" }} />
              <input className="pill" placeholder="Email" style={{ outline: "none", color: "white" }} />
              <input className="pill" placeholder="Phone" style={{ outline: "none", color: "white" }} />
              <button className="btn btnPrimary">Save Profile</button>
            </div>
          ) : null}

          {/* Addresses */}
          {tab === "addresses" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="glass" style={{ padding: 14, borderRadius: 22, border: "1px solid rgba(73,215,255,0.14)" }}>
                <div style={{ fontWeight: 1000 }}>Primary Address</div>
                <div style={{ marginTop: 6, color: "rgba(234,246,255,0.72)", lineHeight: 1.6 }}>
                  221B Neon Street
                  <br />
                  Cyber City, GOA
                  <br />
                  403001
                </div>
              </div>

              <button className="btn btnPrimary">Add New Address</button>
            </div>
          ) : null}

          {/* Settings */}
          {tab === "settings" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <label className="pill" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" defaultChecked />
                Email notifications
              </label>

              <label className="pill" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" defaultChecked />
                SMS notifications
              </label>

              <button className="btn" style={{ borderColor: "rgba(255,77,243,0.22)" }}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </FadeIn>
    </div>
  );
}
