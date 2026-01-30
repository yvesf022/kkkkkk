"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAdminAuth } from "@/lib/adminAuth";

export default function AdminLoginPage() {
  const router = useRouter();

  const login = useAdminAuth((s) => s.login);
  const loading = useAdminAuth((s) => s.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await login(email, password);

      toast.success("Admin login successful");

      // ✅ App Router navigation (Amazon-level)
      router.replace("/admin");
    } catch (err: any) {
      toast.error(err.message || "Admin login failed");
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
