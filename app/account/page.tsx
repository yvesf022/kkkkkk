"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: 18,
        padding: 32,
        boxShadow:
          "0 20px 60px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.6)",
      }}
    >
      {/* HEADER */}
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        My Account
      </h1>

      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Orders, payments & settings
      </p>

      {/* NAV LINKS */}
      <div
        style={{
          display: "grid",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <button
          className="btn btnPrimary"
          onClick={() => router.push("/account/orders")}
        >
          My Orders
        </button>

        <button
          className="btn btnGlow"
          onClick={() => router.push("/account/profile")}
        >
          Profile
        </button>

        <button
          className="btn btnTech"
          onClick={() => router.push("/account/addresses")}
        >
          Addresses
        </button>

        <button
          className="btn btnStyle"
          onClick={() => router.push("/account/payments")}
        >
          Payments
        </button>

        <button
          className="btn btnSecondary"
          onClick={() => router.push("/account/security")}
        >
          Security
        </button>
      </div>

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        className="btn btnDanger"
        style={{ width: "100%" }}
      >
        Log out
      </button>

      <p
        style={{
          marginTop: 14,
          fontSize: 13,
          opacity: 0.6,
          textAlign: "center",
        }}
      >
        You can sign back in anytime
      </p>
    </div>
  );
}
