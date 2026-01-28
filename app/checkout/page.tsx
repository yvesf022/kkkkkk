"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { useCart } from "@/lib/cart";
import { createOrder, getMyAddresses } from "@/lib/api";
import RequireAuth from "@/components/auth/RequireAuth";

type Address = {
  id: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyAddresses();
        setAddresses(data);
        const def = data.find((a) => a.is_default);
        if (def) setSelectedAddress(def.id);
      } catch {
        toast.error("Failed to load addresses");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function placeOrder() {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }

    setPlacing(true);
    try {
      await createOrder({
        address_id: selectedAddress,
      });
      clearCart();
      toast.success("Order placed successfully");
      router.replace("/account/orders");
    } catch {
      toast.error("Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="pageContentWrap">
        <p className="mutedText">Loading checkout…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pageContentWrap">
        <div className="emptyState">
          <h1 className="pageTitle">Your cart is empty</h1>
          <p className="pageSubtitle">
            Add items to your cart before checking out.
          </p>
          <Link href="/store" className="btn btnPrimary">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pageContentWrap">
      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div className="mutedText">Cart › Checkout</div>
        <h1 className="pageTitle">Checkout</h1>
        <p className="pageSubtitle">
          Review your delivery details and place your order.
        </p>
      </div>

      {/* LAYOUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr minmax(280px, 360px)",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* LEFT — ADDRESS */}
        <section className="card">
          <h2 className="sectionTitle">Delivery address</h2>

          {addresses.length === 0 ? (
            <div className="emptyState">
              <p>You don’t have any saved addresses.</p>
              <Link
                href="/account/addresses"
                className="btn btnPrimary"
              >
                Add an address
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="card"
                  style={{
                    cursor: "pointer",
                    border:
                      selectedAddress === a.id
                        ? "2px solid var(--primary)"
                        : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddress === a.id}
                    onChange={() => setSelectedAddress(a.id)}
                    style={{ marginRight: 10 }}
                  />

                  <strong>{a.full_name}</strong>
                  <div className="mutedText">{a.phone}</div>
                  <div>
                    {a.address_line_1}
                    {a.address_line_2 && `, ${a.address_line_2}`}
                    <br />
                    {a.city}, {a.state}
                    <br />
                    {a.postal_code}, {a.country}
                  </div>

                  {a.is_default && (
                    <span className="badgeSuccess">
                      Default
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}

          <Link
            href="/account/addresses"
            className="btn btnGhost"
            style={{ marginTop: 16 }}
          >
            Manage addresses
          </Link>
        </section>

        {/* RIGHT — SUMMARY */}
        <aside className="card">
          <h2 className="sectionTitle">Order summary</h2>

          <div
            style={{
              display: "grid",
              gap: 10,
              fontSize: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Items total</span>
              <strong>
                M{total.toLocaleString()}
              </strong>
            </div>

            <div className="mutedText">
              Shipping will be calculated after payment
              verification.
            </div>
          </div>

          {/* PAYMENT INFO */}
          <div className="infoBox" style={{ marginTop: 18 }}>
            💳 <strong>Payment process</strong>
            <br />
            After placing your order, you’ll receive instructions
            to complete payment externally. Upload your payment
            proof from your order details page.
          </div>

          <button
            className="btn btnPrimary"
            style={{ marginTop: 18 }}
            onClick={placeOrder}
            disabled={placing}
          >
            {placing ? "Placing order…" : "Place order"}
          </button>

          <p className="mutedText" style={{ marginTop: 10 }}>
            Orders are reviewed manually before shipping.
          </p>
        </aside>
      </div>
    </div>
  );
}
