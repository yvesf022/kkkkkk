"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getSession, logout } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function AdminPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ======================
     SESSION CHECK
  ====================== */
  useEffect(() => {
    const session = getSession();

    if (!session) return; // show admin login form

    if (session.role !== "admin") {
      logout("/login");
      return;
    }

    setToken(session.token);
  }, []);

  /* ======================
     ADMIN LOGIN
  ====================== */
  async function handleLogin() {
    if (!email || !password) {
      toast.error("Email and password required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      if (data.role !== "admin") {
        throw new Error("Not an admin account");
      }

      // ✅ STORE SESSION DIRECTLY (NO login() HELPER)
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", data.email);

      toast.success("Welcome admin");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  /* ======================
     ADMIN LOGIN UI
  ====================== */
  if (!token) {
    return (
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 28,
            borderRadius: 22,
            background: "linear-gradient(135deg,#ffffff,#f8fbff)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 18 }}>
            Admin Login
          </h1>

          <div style={{ display: "grid", gap: 14 }}>
            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn btnTech"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ======================
     ADMIN DASHBOARD
  ====================== */
  return (
    <div style={{ maxWidth: 1200, margin: "32px auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>
        Admin Dashboard
      </h1>

      <p style={{ marginTop: 12, opacity: 0.7 }}>
        Welcome to Karabo admin panel
      </p>

      {/* Your existing admin dashboard content continues here */}
    </div>
  );
}
