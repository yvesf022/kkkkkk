"use client";

/**
 * app/account/orders/page.tsx
 *
 * FIX #2: Endless loading on Account Orders page.
 *
 * ROOT CAUSE: ordersApi.getMy() may return { orders: [...] } or { results: [...] }
 * instead of a plain array. When the component does `orders.map(...)` on a plain
 * object, it either throws (client-side exception) or silently returns nothing,
 * leaving the loading spinner running forever.
 *
 * FIX: Normalise the API response to always extract a plain array before setting state.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ordersApi } from "@/lib/api";

type OrderItem = {
  id: string;
  product_id?: string;
  title?: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
  shipping_status?: string;
};

const STATUS_COLORS: Record<string, [string, string]> = {
  pending:    ["#fef9c3", "#854d0e"],
  paid:       ["#dcfce7", "#166534"],
  cancelled:  ["#fee2e2", "#991b1b"],
  shipped:    ["#dbeafe", "#1e40af"],
  completed:  ["#d1fae5", "#065f46"],
  processing: ["#e0f2fe", "#075985"],
};

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const raw = await ordersApi.getMy();
        // FIX #2: Safely extract array regardless of response shape
        const list: Order[] = Array.isArray(raw)
          ? raw
          : (raw as any)?.orders ?? (raw as any)?.results ?? [];
        setOrders(list);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>My Orders</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 88, borderRadius: 12, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
          ))}
        </div>
        <style>{`@keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 800 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 16 }}>My Orders</h1>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", color: "#991b1b", fontSize: 14 }}>
          {error} — <button onClick={() => window.location.reload()} style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>My Orders</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
      </div>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>No orders yet</div>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>When you place an order, it will appear here.</p>
          <Link href="/store" style={{ padding: "10px 22px", borderRadius: 8, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((order) => {
            const [bg, color] = STATUS_COLORS[order.status] ?? ["#f1f5f9", "#475569"];
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
                  padding: 20, cursor: "pointer", transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#94a3b8")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}>
                        R {Number(order.total_amount ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        {order.items?.length ? ` · ${order.items.length} item${order.items.length !== 1 ? "s" : ""}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: bg, color, textTransform: "capitalize" }}>
                        {order.status}
                      </span>
                      {order.shipping_status && order.shipping_status !== "pending" && (
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          Shipping: {order.shipping_status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}