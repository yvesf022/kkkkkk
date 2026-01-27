"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AccountSidebar from "@/components/account/AccountSidebar";

export default function AccountDashboardPage() {
  const router = useRouter();
  const logout = useAuth((s) => s.logout);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        width: "100%",
      }}
    >
      {/* ACCOUNT NAVIGATION */}
      <div
        style={{
          borderRadius: 24,
          padding: 20,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
        }}
      >
        <AccountSidebar />
      </div>

      {/* HEADER */}
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Your account
        </h1>

        <p
          style={{
            marginTop: 6,
            fontSize: 14,
            color: "rgba(15,23,42,0.6)",
            fontWeight: 600,
          }}
        >
          View orders, manage your account, or continue shopping.
        </p>
      </div>

      {/* STATS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        {[
          { label: "Orders", hint: "Your purchases" },
          { label: "Addresses", hint: "Shipping locations" },
          { label: "Payments", hint: "Verification status" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: 20,
              borderRadius: 22,
              background: "linear-gradient(135deg,#ffffff,#f8fbff)",
              boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.6 }}>
              {card.label}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 28,
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              —
            </div>

            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.55 }}>
              {card.hint}
            </div>
          </div>
        ))}
      </div>

      {/* ACTION CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
        }}
      >
        <div
          style={{
            padding: 24,
            borderRadius: 24,
            background: "linear-gradient(135deg,#ffffff,#f8fbff)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.14)",
            display: "grid",
            gap: 14,
          }}
        >
          <h3 style={{ fontWeight: 900 }}>Your orders</h3>
          <p style={{ fontSize: 13, opacity: 0.6 }}>
            Track and manage your orders
          </p>
          <button
            className="btn btnTech"
            onClick={() => router.push("/account/orders")}
          >
            View orders
          </button>
        </div>

        <div
          style={{
            padding: 24,
            borderRadius: 24,
            background: "linear-gradient(135deg,#ffffff,#f8fbff)",
            boxShadow: "0 20px 60px rgba(15,23,42,0.14)",
            display: "grid",
            gap: 14,
          }}
        >
          <h3 style={{ fontWeight: 900 }}>Continue shopping</h3>
          <p style={{ fontSize: 13, opacity: 0.6 }}>
            Browse products while logged in
          </p>
          <button
            className="btn btnPrimary"
            onClick={() => router.push("/store")}
          >
            Browse store
          </button>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          You can safely log out anytime.
        </div>

        <button
          className="btn btnDanger"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
