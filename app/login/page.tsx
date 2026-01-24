// ================================
// app/login/page.tsx
// ================================
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

      localStorage.setItem("token", data.token);
      toast.success("Welcome back");
      window.location.href = "/my-orders";
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container glass neon-border" style={{ maxWidth: 420 }}>
      <h1 className="neon-text">Customer Login</h1>

      <input className="pill" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} />

      <input className="pill" placeholder="Password" type="password" value={password}
        onChange={(e) => setPassword(e.target.value)} />

      <button className="btn btnPrimary" disabled={loading} onClick={login}>
        {loading ? "Signing in…" : "Login"}
      </button>
    </div>
  );
}

// ================================
// app/register/page.tsx
// ================================
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function register() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      toast.success("Account created. Please login.");
      window.location.href = "/login";
    } catch (e: any) {
      toast.error(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container glass neon-border" style={{ maxWidth: 420 }}>
      <h1 className="neon-text">Create Account</h1>

      <input className="pill" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)} />

      <input className="pill" placeholder="Password" type="password" value={password}
        onChange={(e) => setPassword(e.target.value)} />

      <button className="btn btnPrimary" disabled={loading} onClick={register}>
        {loading ? "Creating…" : "Register"}
      </button>
    </div>
  );
}

// ================================
// app/my-orders/page.tsx
// ================================
"use client";

import { useEffect, useState } from "react";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    async function loadOrders() {
      const res = await fetch(`${API}/api/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data || []);
    }

    if (token) loadOrders();
  }, [token]);

  if (!token) {
    return <div className="container">Please login to view your orders.</div>;
  }

  return (
    <div className="container" style={{ display: "grid", gap: 16 }}>
      <h1 className="neon-text">My Orders</h1>

      {orders.length === 0 && <div className="muted">No orders yet.</div>}

      {orders.map((o) => (
        <div key={o.id} className="glass neon-border" style={{ padding: 16 }}>
          <div><strong>Order:</strong> {o.order_reference}</div>
          <div><strong>Payment:</strong> {o.payment_status}</div>
          <div><strong>Shipping:</strong> {o.shipping_status}</div>
          <div><strong>Total:</strong> {o.total_amount} LSL</div>
        </div>
      ))}
    </div>
  );
}
