"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ordersApi,
  adminOrdersAdvancedApi,
} from "@/lib/api";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await ordersApi.getAdmin(status || undefined);
      setOrders(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [status]);

  async function hardDelete(id: string) {
    if (!confirm("Hard delete order?")) return;
    await adminOrdersAdvancedApi.hardDelete(id);
    loadOrders();
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order?")) return;
    await adminOrdersAdvancedApi.forceStatus(id, {
      status: "cancelled",
      reason: "Admin cancelled",
    });
    loadOrders();
  }

  async function refund(id: string) {
    const amount = prompt("Refund amount?");
    if (!amount) return;

    await adminOrdersAdvancedApi.processRefund(id, {
      amount: Number(amount),
      reason: "Admin refund",
    });

    loadOrders();
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>
        Orders
      </h1>

      {/* FILTER */}
      <div style={{ marginTop: 20 }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={select}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <p style={{ marginTop: 20 }}>Loading...</p>
      ) : (
        <div style={card}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(0, 8)}</td>
                  <td>{o.user_email}</td>
                  <td>R {o.total_amount}</td>
                  <td>{o.status}</td>
                  <td>
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td>
                    <button
                      onClick={() =>
                        router.push(`/admin/orders/${o.id}`)
                      }
                      style={btn}
                    >
                      View
                    </button>
                    <button
                      onClick={() => cancelOrder(o.id)}
                      style={btn}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => refund(o.id)}
                      style={btn}
                    >
                      Refund
                    </button>
                    <button
                      onClick={() => hardDelete(o.id)}
                      style={{
                        ...btn,
                        background: "#fee2e2",
                        color: "#991b1b",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  marginTop: 20,
};

const btn: React.CSSProperties = {
  marginRight: 6,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
};

const select: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};
