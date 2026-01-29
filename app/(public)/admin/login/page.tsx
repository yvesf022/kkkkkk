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
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Login failed");
      }

      // ✅ SAVE ADMIN SESSION
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", "admin");

      toast.success("Admin login successful");

      // ✅ FORCE FULL RELOAD (CRITICAL)
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
