"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyOrders } from "@/lib/api";

/* ======================
   TYPES
====================== */

type PaymentStatus = "pending" | "on_hold" | "paid" | "rejected";
type ShippingStatus = "awaiting_shipping" | "shipped" | null;

type UIOrder = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_status: PaymentStatus;
  shipping_status: ShippingStatus;
};

/* ======================
   PAGE
====================== */

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<UIOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    try {
      const data = await getMyOrders();

      const normalized: UIOrder[] = data.map((o: any) => ({
        id: o.id,
        created_at: o.created_at,
        total_amount: o.total_amount,
        payment_status: o.payment_status ?? "pending",
        shipping_status: o.shipping_status ?? null,
      }));

      setOrders(normalized);
    } catch {
      toast.error("Failed to load your orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) {
    return <p>Loading your orders…</p>;
  }

  return (
    <div style={{ maxWidth: 1100, display: "grid", gap: 28 }}>
      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Your orders
        </h1>
        <p style={{ marginTop: 6, fontSize: 14, opacity: 0.6 }}>
          Track payments, verification, and delivery status.
        </p>
      </div>

      {/* TRUST NOTE */}
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: "#f8fafc",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        ℹ️ Payments are completed <strong>externally</strong>.
        Upload your payment proof after checkout.  
        <br />
        Payment details are <strong>never stored</strong> on your account.
      </div>

      {/* ORDERS LIST */}
      <section style={{ display: "grid", gap: 16 }}>
        {orders.length === 0 ? (
          <div
            style={{
              padding: 28,
              borderRadius: 20,
              background: "#f8fafc",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 900 }}>
              You haven’t placed any orders yet
            </div>
            <p style={{ marginTop: 6, fontSize: 14, opacity: 0.6 }}>
              Browse products, place an order, and pay externally
              using the provided instructions.
            </p>

            <button
              className="btn btnPrimary"
              style={{ marginTop: 16 }}
              onClick={() => router.push("/store")}
            >
              Start shopping
            </button>
          </div>
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              style={{
                padding: 22,
                borderRadius: 22,
                background:
                  "linear-gradient(135deg,#ffffff,#f8fbff)",
                boxShadow:
                  "0 18px 50px rgba(15,23,42,0.12)",
                display: "grid",
                gap: 12,
              }}
            >
              {/* TOP ROW */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    Order #{o.id.slice(0, 8)}
                  </div>
                  <div
                    style={{ fontSize: 13, opacity: 0.6 }}
                  >
                    {new Date(
                      o.created_at
                    ).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ fontWeight: 900 }}>
                  M{o.total_amount.toLocaleString()}
                </div>
              </div>

              {/* STATUS */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  fontSize: 14,
                }}
              >
                <div>
                  <strong>Payment:</strong>{" "}
                  {paymentLabel(o.payment_status)}
                </div>

                <div>
                  <strong>Shipping:</strong>{" "}
                  {shippingLabel(o.shipping_status)}
                </div>
              </div>

              {/* ACTION GUIDANCE */}
              {o.payment_status === "on_hold" && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#92400e",
                  }}
                >
                  ⚠ Payment awaiting verification.
                  Upload your payment proof from the order
                  details page.
                </div>
              )}

              {/* ACTIONS */}
              <div>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="btn btnTech"
                >
                  View order details
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/* ======================
   HELPERS
====================== */

function paymentLabel(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "Order placed";
    case "on_hold":
      return "Awaiting payment";
    case "paid":
      return "Payment confirmed";
    case "rejected":
      return "Payment rejected";
  }
}

function shippingLabel(status: ShippingStatus) {
  if (!status) return "Not shipped yet";
  if (status === "awaiting_shipping")
    return "Preparing shipment";
  if (status === "shipped") return "Shipped";
  return "—";
}
