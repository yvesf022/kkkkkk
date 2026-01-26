"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  shipping_status: string;
};

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  useEffect(() => {
    if (!token) return;

    fetch(`${API}/api/orders/admin`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setOrders)
      .catch(() =>
        toast.error("Failed to load analytics data")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading analytics…</p>;

  const totalOrders = orders.length;
  const paidOrders = orders.filter(
    (o) => o.payment_status === "payment_received"
  );
  const pendingPayments = orders.filter(
    (o) => o.payment_status !== "payment_received"
  );
  const shipped = orders.filter(
    (o) => o.shipping_status === "shipped" || o.shipping_status === "delivered"
  );

  const revenue = paidOrders.reduce(
    (sum, o) => sum + o.total_amount,
    0
  );

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
        gap: 18,
      }}
    >
      <Stat label="Total Orders" value={totalOrders} />
      <Stat label="Revenue (Paid)" value={`₹${revenue}`} />
      <Stat label="Pending Payments" value={pendingPayments.length} />
      <Stat label="Shipped Orders" value={shipped.length} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: 20,
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          opacity: 0.6,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}
