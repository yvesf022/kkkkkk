"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ LOGIN (COOKIE-BASED)
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.detail || "Login failed");
      }

      // 2️⃣ VERIFY ADMIN ROLE
      const meRes = await fetch(`${API}/api/auth/me`, {
        credentials: "include",
      });

      if (!meRes.ok) {
        throw new Error("Failed to verify session");
      }

      const user = await meRes.json();

      if (user.role !== "admin") {
        throw new Error("Not an admin account");
      }

      toast.success("Admin login successful");

      // 3️⃣ HARD REDIRECT
      window.location.href = "/admin";
    } catch (err: any) {
      toast.error(err.message || "Login failed");
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
