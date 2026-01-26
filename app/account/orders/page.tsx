"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import RequireAuth from "@/components/auth/RequireAuth";
import { getMyOrders, Order } from "@/lib/api";

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  /* ======================
     LOAD ORDERS
  ====================== */
  async function loadOrders() {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <RequireAuth>
      <div style={{ display: "grid", gap: 24 }}>
        <header>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            My Orders
          </h1>
        </header>

        {loading && <p>Loading orders…</p>}

        {!loading && orders.length === 0 && (
          <p>You have no orders yet.</p>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {orders.map((o) => (
            <section
              key={o.id}
              style={{
                borderRadius: 18,
                padding: 18,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Order #{o.id.slice(0, 8)}
              </div>

              <div>
                <b>Total:</b> ₹{o.total_amount}
              </div>

              <div>
                <b>Payment status:</b> {o.payment_status}
              </div>

              <div>
                <b>Shipping status:</b>{" "}
                {o.shipping_status || "created"}
              </div>

              <Link
                href={`/orders/${o.id}`}
                className="btn btnGhost"
              >
                View Order
              </Link>
            </section>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}
