"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type OrderItem = {
  product_id: string;
  quantity: number;
};

type Product = {
  id: string;
  title: string;
  img: string;
  price: number;
};

type Order = {
  id: string;
  items: OrderItem[];
  total_amount: number;
  payment_status: string;
  shipping_status: string;
  tracking_number?: string;
  created_at: string;
  payment?: {
    proof_url?: string;
  };
};

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [shippingStatus, setShippingStatus] = useState("");
  const [tracking, setTracking] = useState("");

  /* ======================
     LOAD ORDER + PRODUCTS
  ====================== */
  async function load() {
    try {
      const [orderRes, productsRes] = await Promise.all([
        fetch(`${API}/api/orders/${id}`, { credentials: "include" }),
        fetch(`${API}/api/products`),
      ]);

      if (!orderRes.ok || !productsRes.ok) throw new Error();

      const orderData = await orderRes.json();
      const productsData: Product[] = await productsRes.json();

      const map: Record<string, Product> = {};
      productsData.forEach((p) => (map[p.id] = p));

      setProducts(map);
      setOrder(orderData);
      setShippingStatus(orderData.shipping_status);
      setTracking(orderData.tracking_number || "");
    } catch {
      toast.error("Failed to load order");
      router.replace("/admin/orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  /* ======================
     UPDATE ORDER
  ====================== */
  async function update(payload: any) {
    if (!order) return;

    setUpdating(true);
    try {
      const res = await fetch(
        `${API}/api/orders/admin/${order.id}/update`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Order updated");
      await load();
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading order…</p>;
  if (!order) return null;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 900 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <p style={{ opacity: 0.6 }}>
          Created {new Date(order.created_at).toLocaleString()}
        </p>
      </header>

      {/* SUMMARY */}
      <section className="card">
        <div>
          <b>Total:</b> M {order.total_amount.toLocaleString()}
        </div>
        <div>
          <b>Payment:</b> {order.payment_status}
        </div>
        <div>
          <b>Shipping:</b> {order.shipping_status}
        </div>
      </section>

      {/* PAYMENT PROOF */}
      {order.payment?.proof_url && (
        <section className="card">
          <h3>Payment Proof</h3>
          <img
            src={`${API}${order.payment.proof_url}`}
            alt="Payment proof"
            style={{
              maxWidth: "100%",
              borderRadius: 12,
              marginTop: 12,
              border: "1px solid #e5e7eb",
            }}
          />

          {order.payment_status === "payment_submitted" && (
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <button
                className="btn btnTech"
                disabled={updating}
                onClick={() => update({ status: "payment_received" })}
              >
                Approve Payment
              </button>
              <button
                className="btn btnGhost"
                disabled={updating}
                onClick={() => update({ status: "rejected" })}
              >
                Reject Payment
              </button>
            </div>
          )}
        </section>
      )}

      {/* SHIPPING */}
      {order.payment_status === "payment_received" && (
        <section className="card" style={{ display: "grid", gap: 12 }}>
          <h3>Shipping</h3>

          <select
            value={shippingStatus}
            onChange={(e) => setShippingStatus(e.target.value)}
          >
            <option value="created">Created</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>

          <input
            placeholder="Tracking number"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />

          <button
            className="btn btnTech"
            disabled={updating}
            onClick={() =>
              update({
                shipping_status: shippingStatus,
                tracking_number: tracking,
              })
            }
          >
            Update Shipping
          </button>
        </section>
      )}

      {/* ITEMS */}
      <section className="card">
        <h3>Items</h3>

        <div style={{ display: "grid", gap: 12 }}>
          {order.items.map((i, idx) => {
            const p = products[i.product_id];

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                {p && (
                  <img
                    src={p.img}
                    alt={p.title}
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>
                    {p ? p.title : i.product_id}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>
                    Quantity: {i.quantity}
                  </div>
                </div>

                {p && (
                  <div style={{ fontWeight: 700 }}>
                    M {(p.price * i.quantity).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
