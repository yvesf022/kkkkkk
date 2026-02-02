"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminAuthApi } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ======================
     AUTO REDIRECT IF LOGGED IN
  ====================== */
  useEffect(() => {
    adminAuthApi
      .me()
      .then(() => router.replace("/admin"))
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await adminAuthApi.login({ email, password });
      toast.success("Welcome back");
      router.replace("/admin");
    } catch (err: any) {
      toast.error(err.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f6f7f9",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 380,
          padding: 36,
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 30px 80px rgba(0,0,0,.12)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24 }}>
          Admin login
        </h1>

        <label style={label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={input}
        />

        <label style={label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={input}
        />

        <button
          type="submit"
          disabled={loading}
          style={button}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

/* ======================
   STYLES
====================== */

const label: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  marginTop: 14,
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  fontSize: 14,
};

const button: React.CSSProperties = {
  marginTop: 24,
  width: "100%",
  padding: "14px 18px",
  borderRadius: 12,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
