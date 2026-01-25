"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getSession, logout } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */
type Product = {
  id: string;
  title: string;
  price: number;
  category: string;
  img: string;
};

type Order = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items?: { id: string; title: string }[];
};

type Payment = {
  payment_id: string;
  order_id: string;
  amount: number;
  method: string;
  created_at: string;
};

type StockMap = Record<string, number>;

/* ======================
   PAGE
====================== */
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // core data
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // inventory
  const [stock, setStock] = useState<StockMap>({});

  /* ======================
     SESSION (SECURE)
  ====================== */
  useEffect(() => {
    const session = getSession();
    const savedStock = localStorage.getItem("product_stock");

    if (savedStock) setStock(JSON.parse(savedStock));

    if (!session || session.role !== "admin") {
      logout("/login");
      return;
    }

    setToken(session.token);
    setRole(session.role);
    fetchAll(session.token);
  }, []);

  /* ======================
     AUTH
  ====================== */
  async function login() {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || data.role !== "admin") throw new Error();

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      setToken(data.token);
      setRole(data.role);
      fetchAll(data.token);

      toast.success("Admin logged in");
    } catch {
      toast.error("Invalid admin credentials");
    }
  }

  /* ======================
     FETCH ALL
  ====================== */
  async function fetchAll(t: string) {
    await Promise.all([
      fetch(`${API}/api/products`)
        .then((r) => r.json())
        .then(setProducts),

      fetch(`${API}/api/orders/admin/pending-payments`, {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then((r) => r.json())
        .then(setPayments),

      fetch(`${API}/api/orders/my`, {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then((r) => r.json())
        .then(setOrders),
    ]);
  }

  /* ======================
     ANALYTICS
  ====================== */
  const analytics = useMemo(() => {
    const confirmedOrders = orders.filter(
      (o) => o.status === "confirmed"
    );

    const revenue = confirmedOrders.reduce(
      (sum, o) => sum + o.total_amount,
      0
    );

    const productCount: Record<string, number> = {};
    orders.forEach((o) => {
      o.items?.forEach((i) => {
        productCount[i.title] =
          (productCount[i.title] || 0) + 1;
      });
    });

    const bestSellers = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalOrders: orders.length,
      confirmedOrders: confirmedOrders.length,
      pendingPayments: payments.length,
      revenue,
      bestSellers,
      recentOrders: orders.slice(0, 5),
    };
  }, [orders, payments]);

  /* ======================
     LOGIN VIEW
  ====================== */
  if (!token || role !== "admin") {
    return (
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <div style={{ maxWidth: 420 }}>
          <h1>Admin Login</h1>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={login}>Login</button>
        </div>
      </div>
    );
  }

  /* ======================
     DASHBOARD
  ====================== */
  return (
    <div style={{ maxWidth: 1200, margin: "32px auto", display: "grid", gap: 32 }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 20,
        }}
      >
        <Stat title="Revenue" value={`M ${analytics.revenue.toLocaleString("en-ZA")}`} />
        <Stat title="Total Orders" value={analytics.totalOrders} />
        <Stat title="Confirmed Orders" value={analytics.confirmedOrders} />
        <Stat title="Pending Payments" value={analytics.pendingPayments} />
      </section>

      <section>
        <h2>Top Selling Products</h2>
        {analytics.bestSellers.length === 0 && <p>No data yet</p>}
        <ul>
          {analytics.bestSellers.map(([name, count]) => (
            <li key={name}>
              {name} — {count} orders
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Recent Orders</h2>
        {analytics.recentOrders.map((o) => (
          <div key={o.id} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
            <b>#{o.id.slice(0, 8)}</b> — {o.status} — M {o.total_amount}
          </div>
        ))}
      </section>
    </div>
  );
}

/* ======================
   COMPONENT
====================== */
function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background: "linear-gradient(135deg,#f8fbff,#eef6ff)",
        boxShadow: "0 14px 40px rgba(15,23,42,0.14)",
      }}
    >
      <div style={{ fontSize: 13, color: "rgba(15,23,42,0.6)" }}>
        {title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}
