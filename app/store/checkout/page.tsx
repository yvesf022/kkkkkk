"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

import { cartApi, ordersApi, addressesApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import type { Cart, Address } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ── types ──────────────────────────────────────────── */
type Step = "address" | "review";

const EMPTY_ADDR = {
  label: "",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  district: "",
  postal_code: "",
  country: "",
};

/* ══════════════════════════════════════════════════════
   CHECKOUT PAGE
══════════════════════════════════════════════════════ */
export default function CheckoutPage() {
  const router = useRouter();
  const clearCart = useCart((s) => s.clearCart);

  /* ── Auth guard — redirect to login if not authenticated ─── */
  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/store/checkout");
    }
  }, [authLoading, user, router]);

  /* cart */
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);

  /* addresses */
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);

  /* new address form */
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [newAddr, setNewAddr] = useState(EMPTY_ADDR);
  const [savingAddr, setSavingAddr] = useState(false);

  /* order */
  const [notes, setNotes] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [step, setStep] = useState<Step>("address");

  /* ── Load cart + addresses in parallel ─────────────── */
  useEffect(() => {
    Promise.allSettled([
      cartApi.get(),
      addressesApi.list(),
    ]).then(([c, a]) => {
      if (c.status === "fulfilled") setCart(c.value as Cart);
      setCartLoading(false);

      if (a.status === "fulfilled") {
        const list = (a.value as Address[]) ?? [];
        setAddresses(list);
        // Pre-select default address
        const def = list.find((x) => x.is_default) ?? list[0];
        if (def) setSelectedAddrId(def.id);
      }
      setAddrLoading(false);
    });
  }, []);

  /* ── Derived ────────────────────────────────────────── */
  const items = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedAddr = addresses.find((a) => a.id === selectedAddrId) ?? null;

  /* ── Save new address ───────────────────────────────── */
  async function handleSaveAddress() {
    if (!newAddr.full_name || !newAddr.phone || !newAddr.address_line1 || !newAddr.city) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSavingAddr(true);
    try {
      const created = await addressesApi.create({
        label: newAddr.label || "Home",
        full_name: newAddr.full_name,
        phone: newAddr.phone,
        address_line1: newAddr.address_line1,
        address_line2: newAddr.address_line2 || undefined,
        city: newAddr.city,
        district: newAddr.district || undefined,
        postal_code: newAddr.postal_code || undefined,
        country: newAddr.country || "Lesotho",
      }) as Address;
      setAddresses((prev) => [...prev, created]);
      setSelectedAddrId(created.id);
      setShowNewAddr(false);
      setNewAddr(EMPTY_ADDR);
      toast.success("Address saved!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save address");
    } finally {
      setSavingAddr(false);
    }
  }

  /* ── Place order ────────────────────────────────────── */
  async function handlePlaceOrder() {
    if (!selectedAddr) {
      toast.error("Please select a shipping address");
      setStep("address");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setPlacingOrder(true);
    try {
      // Build shipping address payload from the Address type
      const shippingAddress = {
        full_name: selectedAddr.full_name,
        phone: selectedAddr.phone,
        address_line1: selectedAddr.address_line1,
        address_line2: selectedAddr.address_line2 ?? "",
        city: selectedAddr.city,
        district: selectedAddr.district ?? "",
        postal_code: selectedAddr.postal_code ?? "",
        label: selectedAddr.label ?? "",
      };

      const order = await ordersApi.create({
        total_amount: subtotal,
        shipping_address: shippingAddress,
        notes: notes.trim() || undefined,
      }) as any;

      // Clear cart in Zustand + server
      await clearCart();

      const orderId = order?.id ?? order?.order_id;
      if (!orderId) throw new Error("Order created but no ID returned");

      toast.success("Order placed! Complete your payment.");
      router.push(`/store/payment?order_id=${orderId}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  }

  /* ── Guards ─────────────────────────────────────────── */
  /* ── Show nothing while auth resolves (avoids flash then redirect) ── */
  if (authLoading || !user) return null;

  if (cartLoading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Loading checkout…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 56 }}>🛒</div>
        <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Nothing to checkout</h2>
        <Link href="/store" style={{ padding: "12px 28px", borderRadius: 12, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 800 }}>
          Back to Store
        </Link>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "40px 0 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>Checkout</h1>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {items.length} item{items.length > 1 ? "s" : ""} · {formatCurrency(subtotal)}
          </div>
        </div>

        {/* Step tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 32, background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", width: "fit-content" }}>
          {(["address", "review"] as Step[]).map((s, i) => (
            <button
              key={s}
              onClick={() => { if (s === "review" && !selectedAddr) { toast.error("Select an address first"); return; } setStep(s); }}
              style={{
                padding: "11px 28px",
                border: "none",
                background: step === s ? "#0f172a" : "transparent",
                color: step === s ? "#fff" : "#64748b",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                borderRight: i === 0 ? "1px solid #e5e7eb" : "none",
              }}
            >
              {i + 1}. {s === "address" ? "Shipping Address" : "Review & Place Order"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>

          {/* ═══ LEFT COLUMN ═══ */}
          <div>
            {/* ── STEP 1: ADDRESS ── */}
            {step === "address" && (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 28 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px", color: "#0f172a" }}>
                  Select Shipping Address
                </h2>

                {addrLoading ? (
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading addresses…</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        style={{
                          display: "flex",
                          gap: 14,
                          padding: 16,
                          borderRadius: 14,
                          border: `2px solid ${selectedAddrId === addr.id ? "#0f172a" : "#e5e7eb"}`,
                          cursor: "pointer",
                          background: selectedAddrId === addr.id ? "#f8fafc" : "#fff",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddrId === addr.id}
                          onChange={() => setSelectedAddrId(addr.id)}
                          style={{ marginTop: 2, accentColor: "#0f172a" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 2 }}>
                            {addr.full_name}
                            {addr.is_default && (
                              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 99 }}>
                                Default
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                            {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}, {addr.city}
                            {addr.district ? `, ${addr.district}` : ""}
                            {addr.postal_code ? ` ${addr.postal_code}` : ""}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>{addr.phone}</div>
                        </div>
                      </label>
                    ))}

                    {/* Add new address */}
                    {!showNewAddr ? (
                      <button
                        onClick={() => setShowNewAddr(true)}
                        style={{ padding: "13px", borderRadius: 12, border: "2px dashed #d1d5db", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                      >
                        + Add New Address
                      </button>
                    ) : (
                      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>New Address</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Label (e.g. Home)" value={newAddr.label} onChange={(v) => setNewAddr((p) => ({ ...p, label: v }))} />
                          <Field label="Full Name *" value={newAddr.full_name} onChange={(v) => setNewAddr((p) => ({ ...p, full_name: v }))} />
                          <Field label="Phone *" value={newAddr.phone} onChange={(v) => setNewAddr((p) => ({ ...p, phone: v }))} />
                          <Field label="City *" value={newAddr.city} onChange={(v) => setNewAddr((p) => ({ ...p, city: v }))} />
                          <Field label="District" value={newAddr.district} onChange={(v) => setNewAddr((p) => ({ ...p, district: v }))} />
                          <Field label="Postal Code" value={newAddr.postal_code} onChange={(v) => setNewAddr((p) => ({ ...p, postal_code: v }))} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <Field label="Street Address *" value={newAddr.address_line1} onChange={(v) => setNewAddr((p) => ({ ...p, address_line1: v }))} />
                        <Field label="Address Line 2" value={newAddr.address_line2} onChange={(v) => setNewAddr((p) => ({ ...p, address_line2: v }))} />
                        <Field label="Country *" value={newAddr.country} onChange={(v) => setNewAddr((p) => ({ ...p, country: v }))} />
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                          <button onClick={handleSaveAddress} disabled={savingAddr} style={primaryBtn}>
                            {savingAddr ? "Saving…" : "Save Address"}
                          </button>
                          <button onClick={() => { setShowNewAddr(false); setNewAddr(EMPTY_ADDR); }} style={outlineBtn}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={() => {
                      if (!selectedAddrId) { toast.error("Please select or add a shipping address"); return; }
                      setStep("review");
                    }}
                    style={{ ...primaryBtn, padding: "14px 32px", fontSize: 15 }}
                  >
                    Continue to Review →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: REVIEW ── */}
            {step === "review" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Selected address summary */}
                {selectedAddr && (
                  <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Shipping To</h2>
                      <button onClick={() => setStep("address")} style={{ fontSize: 13, color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                        Change
                      </button>
                    </div>
                    <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 600, marginBottom: 2 }}>{selectedAddr.full_name}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      {selectedAddr.address_line1}{selectedAddr.address_line2 ? `, ${selectedAddr.address_line2}` : ""}, {selectedAddr.city}
                      {selectedAddr.district ? `, ${selectedAddr.district}` : ""}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{selectedAddr.phone}</div>
                  </div>
                )}

                {/* Order items */}
                <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px" }}>Order Items</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {items.map((item) => (
                      <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 56, height: 56, borderRadius: 10, background: "#f1f5f9", overflow: "hidden", flexShrink: 0 }}>
                          {item.product?.main_image ? (
                            <img src={item.product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📦</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.product?.title ?? "Product"}
                          </div>
                          {item.variant && (
                            <div style={{ fontSize: 12, color: "#64748b" }}>{item.variant.title}</div>
                          )}
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>Qty: {item.quantity}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                    Order Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions for your order…"
                    rows={3}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>

                {/* Place order */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  style={{
                    padding: "17px",
                    borderRadius: 14,
                    border: "none",
                    background: "#0f172a",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 17,
                    cursor: "pointer",
                    opacity: placingOrder ? 0.75 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {placingOrder ? "Placing Order…" : `Place Order · ${formatCurrency(subtotal)}`}
                </button>
              </div>
            )}
          </div>

          {/* ═══ RIGHT: ORDER SUMMARY ═══ */}
          <div style={{ position: "sticky", top: 100 }}>
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>Order Summary</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                      {item.product?.title ?? "Item"} × {item.quantity}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>Subtotal</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>Shipping</span>
                  <span style={{ fontWeight: 700, color: "#166534" }}>Free</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 12, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800 }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 22 }}>{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "🔒", text: "Secure checkout" },
                { icon: "🚚", text: "Free delivery" },
                { icon: "↩️", text: "Easy 30-day returns" },
              ].map((b) => (
                <div key={b.text} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "#475569" }}>
                  <span>{b.icon}</span><span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small sub-components ─────────────────────────── */
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 5 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e0db", fontSize: 13, boxSizing: "border-box" }}
      />
    </div>
  );
}

const primaryBtn: React.CSSProperties = { padding: "12px 22px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const outlineBtn: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#475569" };