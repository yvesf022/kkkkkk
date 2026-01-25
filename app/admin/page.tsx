"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getSession, logout } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */
type Order = {
  id: string;
  user_email: string;
  total_amount: number;
  status: string; // payment status
  shipping_status?: string;
  created_at: string;
};

type Tab = "orders";

export default function AdminPage() {
  const router = useRouter();

  /* ======================
     AUTH
  ====================== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ======================
     UI
  ====================== */
  const [activeTab, setActiveTab] = useState<Tab>("orders");

  /* ======================
     ORDERS
  ====================== */
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  /* ======================
     SESSION CHECK
  ====================== */
  useEffect(() => {
    const session = getSession();
    if (!session) return;
    if (session.role !== "admin") {
      logout("/login");
      return;
    }
    setToken(session.token);
  }, []);

  /* ======================
     LOGIN
  ====================== */
  async function handleLogin() {
    if (!email || !password) return toast.error("Missing credentials");

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      if (data.role !== "admin") throw new Error("Not admin");

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", data.email);

      toast.success("Welcome admin");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ======================
     FETCH ORDERS
  ====================== */
  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [token]);

  /* ======================
     UPDATE SHIPPING
  ====================== */
  async function updateShipping(
    orderId: string,
    shipping_status: string
  ) {
    setUpdating(orderId);
    try {
      const res = await fetch(
        `${API}/api/admin/orders/${orderId}/shipping`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ shipping_status }),
        }
      );

      if (!res.ok) throw new Error();
      toast.success("Shipping status updated");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, shipping_status }
            : o
        )
      );
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdating(null);
    }
  }

  /* ======================
     LOGIN UI
  ====================== */
  if (!token) {
    return (
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <div style={{ width: 420, padding: 32 }}>
          <h1>Admin Login</h1>
          <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </div>
      </div>
    );
  }

  /* ======================
     DASHBOARD
  ====================== */
  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>
        Orders & Shipping
      </h1>

      {loadingOrders && <p>Loading orders…</p>}

      <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
        {orders.map((o) => (
          <div
            key={o.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 18,
              background: "#fff",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>
              Order #{o.id.slice(0, 8)}
            </div>
            <div>Email: {o.user_email}</div>
            <div>Total: ₹{o.total_amount}</div>
            <div>Payment: {o.status}</div>
            <div>
              Shipping:{" "}
              <b>{o.shipping_status || "pending"}</b>
            </div>

            {o.status !== "cancelled" && (
              <select
                disabled={updating === o.id}
                value={o.shipping_status || "pending"}
                onChange={(e) =>
                  updateShipping(o.id, e.target.value)
                }
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
