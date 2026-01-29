"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";

export default function AddressesPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  if (!user) return null;

  function handleLogout() {
    logout();
    toast.success("Logged out");
    router.replace("/login");
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 24 }}>
        Your Addresses
      </h1>

      {/* EMPTY STATE (Amazon-style) */}
      <div
        style={{
          padding: 32,
          borderRadius: 18,
          background: "#fff",
          boxShadow: "0 14px 40px rgba(0,0,0,.08)",
          marginBottom: 32,
        }}
      >
        <p style={{ opacity: 0.7 }}>
          You haven’t added any delivery addresses yet.
        </p>

        <button
          onClick={() => router.push("/account/addresses/new")}
          style={{
            marginTop: 16,
            padding: "12px 18px",
            borderRadius: 10,
            border: "none",
            fontWeight: 800,
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Add new address
        </button>
      </div>

      {/* QUIET LOGOUT */}
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
  );
}
