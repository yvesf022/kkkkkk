"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const router = useRouter();

  if (!user) return null;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* PROFILE IDENTITY CARD */}
      <div
        style={{
          display: "flex",
          gap: 28,
          padding: 32,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
          marginBottom: 40,
        }}
      >
        {/* AVATAR */}
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#ff2fa0,#00e6ff)",
            display: "grid",
            placeItems: "center",
            fontSize: 42,
            fontWeight: 900,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {user.full_name?.[0]?.toUpperCase() ||
            user.email[0].toUpperCase()}
        </div>

        {/* USER DETAILS */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>
            {user.full_name || "Your Profile"}
          </h1>

          <p style={{ fontSize: 15, opacity: 0.75 }}>{user.email}</p>

          {user.phone && (
            <p style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>
              {user.phone}
            </p>
          )}

          <div
            style={{
              marginTop: 14,
              fontSize: 13,
              opacity: 0.55,
            }}
          >
            Account type: {user.role}
          </div>

          {/* EDIT PROFILE */}
          <button
            onClick={() => router.push("/account/profile/edit")}
            style={{
              marginTop: 18,
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.12)",
              background: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Edit profile
          </button>
        </div>
      </div>

      {/* ACCOUNT SECTIONS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 20,
        }}
      >
        <SectionCard
          title="Orders"
          desc="Track, return or buy again"
          onClick={() => router.push("/account/orders")}
        />

        <SectionCard
          title="Addresses"
          desc="Manage delivery locations"
          onClick={() => router.push("/account/addresses")}
        />

        <SectionCard
          title="Payments"
          desc="Cards, refunds & billing"
          onClick={() => router.push("/account/payments")}
        />

        <SectionCard
          title="Security"
          desc="Password & account safety"
          onClick={() => router.push("/account/security")}
        />
      </div>

      {/* LOGOUT (QUIET) */}
      <div style={{ marginTop: 48 }}>
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "none",
            color: "#b00020",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- */

function SectionCard({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 24,
        borderRadius: 16,
        background: "#fff",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 14px 40px rgba(0,0,0,.08)",
      }}
    >
      <h3 style={{ fontWeight: 800, marginBottom: 6 }}>{title}</h3>
      <p style={{ opacity: 0.65, fontSize: 14 }}>{desc}</p>
    </button>
  );
}
