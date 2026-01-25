"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getSession, logout } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Order = {
  id: string;
  total_amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function AccountPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  /* ======================
     SESSION CHECK
  ====================== */
  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setEmail(session.email);
    fetchOrders(session.token);
  }, []);

  /* ======================
     FETCH USER ORDERS
  ====================== */
  async function fetchOrders(token: string) {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API}/api/orders/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load your orders");
    } finally {
      setLoadingOrders(false);
    }
  }

  /* ======================
     LOGOUT
  ====================== */
  function handleLogout() {
    logout("/");
  }

  return (
    <div style={{ display: "grid", gap: 26 }}>
      {/* ================= HEADER ================= */}
      <section
        style={{
          borderRadius: 24,
          padding: 26,
          background: `
            radial-gradient(
              420px 200px at 10% 0%,
              rgba(96,165,250,0.22),
              transparent 60%
            ),
            radial-gradient(
              360px 180px at 90% 10%,
              rgba(244,114,182,0.18),
              transparent 60%
            ),
            linear-gradient(135deg,#f8fbff,#eef6ff,#fff1f6)
          `,
          boxShadow: "0 22px 60px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          My Account
        </h1>

        <p
          style={{
            marginTop: 6,
            fontWeight: 600,
            color: "rgba(15,23,42,0.6)",
          }}
        >
          Logged in as <b>{email}</b>
        </p>
      </section>

      {/* ================= ORDERS SUMMARY ================= */}
      <section
        style={{
          borderRadius: 22,
          padding: 22,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
        }}
      >
        <h2 style={{ fontWeight: 900, marginBottom: 12 }}>
          Recent Orders
        </h2>

        {loadingOrders && <p>Loading orders…</p>}

        {!loadingOrders && orders.length === 0 && (
          <p style={{ opacity: 0.6 }}>
            You haven’t placed any orders yet.
          </p>
        )}

        {!loadingOrders &&
          orders.slice(0, 3).map((o) => (
            <div
              key={o.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  ₹{o.total_amount}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.6,
                  }}
                >
                  {new Date(o.created_at).toLocaleDateString()}
                </div>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background:
                    o.status === "approved"
                      ? "#dcfce7"
                      : o.status === "rejected"
                      ? "#fee2e2"
                      : "#fef3c7",
                  color:
                    o.status === "approved"
                      ? "#166534"
                      : o.status === "rejected"
                      ? "#991b1b"
                      : "#92400e",
                }}
              >
                {o.status.toUpperCase()}
              </span>
            </div>
          ))}

        <div style={{ marginTop: 14 }}>
          <Link href="/account/orders" className="btn btnGhost">
            View all orders →
          </Link>
        </div>
      </section>

      {/* ================= QUICK ACTIONS ================= */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        <Link href="/account/orders" className="btn btnTech">
          My Orders
        </Link>
        <Link href="/account/profile" className="btn btnTech">
          Profile
        </Link>
        <Link href="/account/settings" className="btn btnTech">
          Settings
        </Link>
      </section>

      {/* ================= FOOTER ACTIONS ================= */}
      <section
        style={{
          borderRadius: 24,
          padding: 20,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Link href="/store" className="btn btnGhost">
          ← Back to Store
        </Link>

        <button className="btn btnTech" onClick={handleLogout}>
          Logout
        </button>
      </section>
    </div>
  );
}
