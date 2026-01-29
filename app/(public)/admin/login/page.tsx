"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔑 LOGIN — COOKIE BASED (REQUIRED)
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ CRITICAL (fixes 401)
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Login failed");
      }

      // 🔐 VERIFY SESSION + ROLE
      const meRes = await fetch(`${API}/api/auth/me`, {
        credentials: "include", // ✅ REQUIRED
      });

      if (!meRes.ok) {
        throw new Error("Failed to verify session");
      }

      const user = await meRes.json();

      if (user.role !== "admin") {
        throw new Error("This account is not an admin");
      }

      toast.success("Admin login successful");

      // 🚀 HARD REDIRECT (bypasses Next router edge cases)
      window.location.href = "/admin";
    } catch (err: any) {
      toast.error(err.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 28 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>
        Admin Login
      </h1>

      <p style={{ opacity: 0.6, marginBottom: 20 }}>
        Restricted access
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn btnTech" disabled={loading}>
          {loading ? "Signing in…" : "Login as Admin"}
        </button>
      </form>
    </div>
  );
}
