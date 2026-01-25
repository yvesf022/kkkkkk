"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/Motion";

type Tab = "orders" | "profile" | "addresses" | "settings";

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

/* =======================
   UI HELPERS
======================= */

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
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 999,
        border: "1px solid rgba(96,165,250,0.35)",
        background: active
          ? "linear-gradient(135deg,#e0f2ff,#f0f7ff)"
          : "rgba(255,255,255,0.65)",
        boxShadow: active
          ? "0 8px 26px rgba(96,165,250,0.25)"
          : "0 4px 14px rgba(15,23,42,0.08)",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Delivered: "rgba(34,197,94,0.15)",
    Shipped: "rgba(96,165,250,0.18)",
    Processing: "rgba(244,114,182,0.18)",
  };

  return (
    <span
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: map[status] ?? "rgba(15,23,42,0.1)",
      }}
    >
      {status}
    </span>
  );
}

/* =======================
   PAGE
======================= */

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>("orders");

  const title = useMemo(() => {
    if (tab === "profile") return "Profile";
    if (tab === "addresses") return "Addresses";
    if (tab === "settings") return "Settings";
    return "Orders";
  }, [tab]);

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* ================= HEADER ================= */}
      <FadeIn>
        <section
          style={{
            borderRadius: 24,
            padding: 24,
            background: `
              radial-gradient(
                420px 200px at 10% 0%,
                rgba(96,165,250,0.22),
                transparent 60%
              ),
              radial-gradient(
                360px 180px at 90% 10%,
                rgba(244,114,182,0.18),
                transparent 60%
              ),
              linear-gradient(
                135deg,
                #f8fbff,
                #eef6ff,
                #fff1f6
              )
            `,
            boxShadow:
              "0 22px 60px rgba(15,23,42,0.14)",
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            Account
          </h1>

          <p
            style={{
              marginTop: 6,
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(15,23,42,0.6)",
            }}
          >
            Manage orders, profile details, addresses, and settings.
          </p>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <TabButton label="Orders" active={tab === "orders"} onClick={() => setTab("orders")} />
            <TabButton label="Profile" active={tab === "profile"} onClick={() => setTab("profile")} />
            <TabButton label="Addresses" active={tab === "addresses"} onClick={() => setTab("addresses")} />
            <TabButton label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
          </div>
        </section>
      </FadeIn>

      {/* ================= CONTENT ================= */}
      <FadeIn delay={0.05}>
        <section
          style={{
            borderRadius: 24,
            padding: 24,
            background:
              "linear-gradient(135deg,#ffffff,#f8fbff)",
            boxShadow:
              "0 22px 60px rgba(15,23,42,0.14)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{title}</h2>

            <Link href="/store" className="btn btnTech">
              Continue Shopping →
            </Link>
          </div>

          <div style={{ height: 1, background: "rgba(15,23,42,0.08)", margin: "18px 0" }} />

          {/* ORDERS */}
          {tab === "orders" && (
            <div style={{ display: "grid", gap: 16 }}>
              {demoOrders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    background:
                      "linear-gradient(135deg,#ffffff,#f4f9ff)",
                    boxShadow:
                      "0 12px 34px rgba(15,23,42,0.12)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{o.id}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "rgba(15,23,42,0.6)" }}>
                        {o.date} • {o.items} items
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <StatusBadge status={o.status} />
                      <div style={{ fontWeight: 900 }}>₹ {o.total}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btnGhost">Track</button>
                    <button className="btn btnGhost">Invoice</button>
                    <button className="btn btnGhost">Support</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
              <input className="pill" placeholder="Full Name" />
              <input className="pill" placeholder="Email" />
              <input className="pill" placeholder="Phone" />
              <button className="btn btnTech">Save Profile</button>
            </div>
          )}

          {/* ADDRESSES */}
          {tab === "addresses" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  padding: 18,
                  borderRadius: 22,
                  background:
                    "linear-gradient(135deg,#ffffff,#f4f9ff)",
                  boxShadow:
                    "0 12px 34px rgba(15,23,42,0.12)",
                }}
              >
                <div style={{ fontWeight: 900 }}>Primary Address</div>
                <div style={{ marginTop: 6, lineHeight: 1.6, color: "rgba(15,23,42,0.65)" }}>
                  221B Neon Street
                  <br />
                  Cyber City, GOA
                  <br />
                  403001
                </div>
              </div>

              <button className="btn btnTech">Add New Address</button>
            </div>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div style={{ display: "grid", gap: 14, maxWidth: 420 }}>
              <label className="pill" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" defaultChecked />
                Email notifications
              </label>

              <label className="pill" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" defaultChecked />
                SMS notifications
              </label>

              <button className="btn btnGhost">Logout</button>
            </div>
          )}
        </section>
      </FadeIn>
    </div>
  );
}
