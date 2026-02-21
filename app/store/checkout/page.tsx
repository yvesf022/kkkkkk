"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { cartApi, ordersApi, addressesApi, paymentsApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import type { Cart, Address, Payment } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ─── Types ─── */
type Step = "address" | "review";

/* ─── Resolve best image from cart item ─── */
function resolveItemImage(item: any): string | null {
  if (item.image_url) return item.image_url;
  if (item.variant?.image_url) return item.variant.image_url;
  if (item.product?.main_image) return item.product.main_image;
  const imgs = item.product?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === "string") return first;
    return first?.image_url ?? first?.url ?? null;
  }
  return null;
}

/* ─── Normalise payment response — backend may wrap it ─── */
function extractPayment(raw: unknown): Payment | null {
  if (!raw) return null;
  const r = raw as any;
  const pmt = r?.payment ?? r?.data ?? r?.result ?? r;
  return pmt?.id ? (pmt as Payment) : null;
}

const EMPTY_ADDR = {
  label: "", full_name: "", phone: "",
  address_line1: "", address_line2: "",
  city: "", district: "", postal_code: "", country: "",
};

const FF = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0A0F1E";
const ACCENT = "#1E3A8A";

/* ─── Spinner ─── */
const Spinner = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin .7s linear infinite" }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".15" />
    <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ═══════════════════════════════════════════════
   CHECKOUT PAGE
═══════════════════════════════════════════════ */
export default function CheckoutPage() {
  const router = useRouter();

  // ✅ Safe Zustand selector — stable function reference
  const clearCart = useCart((s) => s.clearCart);
  const user = useAuth((s) => s.user);
  const authLoading = useAuth((s) => s.loading);

  /* ─── Auth guard ─── */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/store/checkout");
    }
  }, [authLoading, user, router]);

  /* ─── Data state ─── */
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);

  /* ─── New address form ─── */
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [newAddr, setNewAddr] = useState(EMPTY_ADDR);
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  /* ─── Order + payment ─── */
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<Step>("address");

  /* Three-phase button state for the confirm button */
  const [confirmPhase, setConfirmPhase] = useState<
    "idle" | "creating-order" | "initiating-payment" | "redirecting"
  >("idle");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  /* ─── Load cart + addresses in parallel ─── */
  useEffect(() => {
    Promise.allSettled([cartApi.get(), addressesApi.list()]).then(([c, a]) => {
      if (c.status === "fulfilled") setCart(c.value as Cart);
      setCartLoading(false);

      if (a.status === "fulfilled") {
        const list = Array.isArray(a.value) ? (a.value as Address[]) : [];
        setAddresses(list);
        const def = list.find((x) => x.is_default) ?? list[0];
        if (def) setSelectedAddrId(def.id);
      }
      setAddrLoading(false);
    });
  }, []);

  /* ─── Derived ─── */
  const items = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedAddr = addresses.find((a) => a.id === selectedAddrId) ?? null;
  const isConfirming = confirmPhase !== "idle";

  /* ─── Save new address ─── */
  async function handleSaveAddress() {
    if (!newAddr.full_name || !newAddr.phone || !newAddr.address_line1 || !newAddr.city || !newAddr.country) {
      setAddrError("Please fill in: Full Name, Phone, Street Address, City, Country");
      return;
    }
    setSavingAddr(true); setAddrError(null);
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
        country: newAddr.country,
      }) as Address;
      setAddresses((prev) => [...prev, created]);
      setSelectedAddrId(created.id);
      setShowNewAddr(false);
      setNewAddr(EMPTY_ADDR);
    } catch (e: any) {
      setAddrError(e?.message ?? "Failed to save address");
    } finally {
      setSavingAddr(false);
    }
  }

  /* ═══════════════════════════════════════════════
     CONFIRM ORDER — the key fix:
     1. POST /api/orders          → create order
     2. POST /api/payments/{id}   → initiate payment (so payment exists before PaymentClient loads)
     3. Redirect to /store/payment?order_id={id}
     PaymentClient then finds the existing payment via GET /api/payments/my
     and goes straight to step 2 (Transfer Funds) — no creation needed there.
  ═══════════════════════════════════════════════ */
  async function handleConfirmOrder() {
    if (!selectedAddr) {
      setConfirmError("Please select a shipping address");
      setStep("address");
      return;
    }
    if (items.length === 0) {
      setConfirmError("Your cart is empty");
      return;
    }

    setConfirmError(null);

    /* ── Phase 1: Create order ── */
    setConfirmPhase("creating-order");
    let orderId: string;
    try {
      const orderRaw = await ordersApi.create({
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id ?? undefined,
          quantity: i.quantity,
          price: i.price,
        })),
        total_amount: subtotal,
        shipping_address: {
          full_name: selectedAddr.full_name,
          phone: selectedAddr.phone,
          address_line1: selectedAddr.address_line1,
          address_line2: selectedAddr.address_line2 ?? "",
          city: selectedAddr.city,
          district: selectedAddr.district ?? "",
          postal_code: selectedAddr.postal_code ?? "",
          country: selectedAddr.country ?? "",
          label: selectedAddr.label ?? "",
        },
        notes: notes.trim() || undefined,
      }) as any;

      // Normalise order response
      const order = orderRaw?.order ?? orderRaw?.data ?? orderRaw;
      orderId = order?.id ?? order?.order_id;
      if (!orderId) throw new Error("Order created but server returned no ID");
    } catch (e: any) {
      setConfirmError(e?.message ?? "Failed to create order. Please try again.");
      setConfirmPhase("idle");
      return;
    }

    /* ── Phase 2: Initiate payment ── */
    setConfirmPhase("initiating-payment");
    try {
      const pmtRaw = await paymentsApi.create(orderId);
      const pmt = extractPayment(pmtRaw);

      // Payment initiated — log for debugging
      console.debug("[Checkout] payment initiated:", pmt?.id ?? pmtRaw);

      // If payment creation returns a weird shape but no error was thrown,
      // we still proceed — PaymentClient will find it via GET /payments/my
    } catch (e: any) {
      // Non-fatal: payment initiation failed but order exists.
      // PaymentClient will try to create it again, which is fine.
      // We still redirect so the user can complete payment.
      console.warn("[Checkout] payment initiation failed (non-fatal):", e?.message);
    }

    /* ── Phase 3: Clear cart + redirect ── */
    setConfirmPhase("redirecting");
    try {
      await clearCart();
    } catch {
      // Cart clear failure is non-fatal
    }

    router.push(`/store/payment?order_id=${orderId}`);
  }

  /* ─── Button label per phase ─── */
  const confirmLabel = {
    idle: `Confirm Order · ${formatCurrency(subtotal)}`,
    "creating-order": "Creating your order…",
    "initiating-payment": "Setting up payment…",
    redirecting: "Redirecting…",
  }[confirmPhase];

  /* ═══════════ EARLY RETURNS ═══════════ */
  if (authLoading || !user) return null;

  if (cartLoading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontFamily: FF }}>
      <Spinner size={20} /> &nbsp; Loading checkout…
    </div>
  );

  if (items.length === 0) return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 32, fontFamily: FF }}>
      <div style={{ fontSize: 56 }}>🛒</div>
      <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0, color: BRAND }}>Nothing to checkout</h2>
      <p style={{ color: "#64748B", fontSize: 14 }}>Add items to your cart before checking out.</p>
      <Link href="/store" style={{ padding: "13px 28px", borderRadius: 12, background: BRAND, color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 14 }}>
        Browse Products
      </Link>
    </div>
  );

  /* ═══════════ MAIN RENDER ═══════════ */
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", padding: "40px 0 80px", fontFamily: FF }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .addr-card:hover { border-color: #CBD5E1 !important; }
        .btn-h:hover { opacity: .88; }
        .ghost-h:hover { background: #F1F5F9 !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/store/cart" style={{ fontSize: 13, color: "#64748B", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
            ← Back to Cart
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: BRAND, margin: "0 0 4px", letterSpacing: "-0.03em" }}>Checkout</h1>
          <div style={{ fontSize: 13, color: "#64748B" }}>
            {items.length} item{items.length !== 1 ? "s" : ""} · {formatCurrency(subtotal)}
          </div>
        </div>

        {/* Step tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 28, background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden", width: "fit-content" }}>
          {(["address", "review"] as Step[]).map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (s === "review" && !selectedAddr) return;
                setStep(s);
              }}
              style={{
                padding: "11px 28px", border: "none",
                background: step === s ? BRAND : "transparent",
                color: step === s ? "#fff" : "#64748B",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                borderRight: i === 0 ? "1px solid #E5E7EB" : "none",
                fontFamily: FF, transition: "all .15s",
              }}
            >
              {i + 1}. {s === "address" ? "Shipping Address" : "Review & Confirm"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>

          {/* ════ LEFT COLUMN ════ */}
          <div style={{ animation: "fadeUp .3s ease" }}>

            {/* ── STEP 1: Address ── */}
            {step === "address" && (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 28 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px", color: BRAND }}>
                  Shipping Address
                </h2>

                {addrLoading ? (
                  <div style={{ color: "#94A3B8", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <Spinner size={14} /> Loading addresses…
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className="addr-card"
                        style={{
                          display: "flex", gap: 14, padding: 16, borderRadius: 14,
                          border: `2px solid ${selectedAddrId === addr.id ? BRAND : "#E5E7EB"}`,
                          cursor: "pointer",
                          background: selectedAddrId === addr.id ? "#F8FAFC" : "#fff",
                          transition: "border-color .15s",
                        }}
                      >
                        <input
                          type="radio" name="address" value={addr.id}
                          checked={selectedAddrId === addr.id}
                          onChange={() => setSelectedAddrId(addr.id)}
                          style={{ marginTop: 3, accentColor: BRAND, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: BRAND, marginBottom: 3 }}>
                            {addr.full_name}
                            {addr.label && (
                              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: "#F1F5F9", color: "#64748B", padding: "2px 8px", borderRadius: 99 }}>
                                {addr.label}
                              </span>
                            )}
                            {addr.is_default && (
                              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: 99 }}>
                                Default
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                            {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}<br />
                            {addr.city}{addr.district ? `, ${addr.district}` : ""}{addr.postal_code ? ` ${addr.postal_code}` : ""}<br />
                            {addr.country}
                          </div>
                          <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>{addr.phone}</div>
                        </div>
                      </label>
                    ))}

                    {addresses.length === 0 && !showNewAddr && (
                      <div style={{ padding: "20px", textAlign: "center", background: "#F8FAFC", borderRadius: 12, color: "#94A3B8", fontSize: 13 }}>
                        No saved addresses yet. Add one below.
                      </div>
                    )}

                    {/* Add new address */}
                    {!showNewAddr ? (
                      <button
                        onClick={() => { setShowNewAddr(true); setAddrError(null); }}
                        style={{ padding: "13px", borderRadius: 12, border: "2px dashed #D1D5DB", background: "transparent", color: "#64748B", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: FF }}
                      >
                        + Add New Address
                      </button>
                    ) : (
                      <div style={{ border: "1px solid #E5E7EB", borderRadius: 16, padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: BRAND }}>New Address</div>

                        {addrError && (
                          <div style={{ padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#9F1239" }}>
                            {addrError}
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <Field label="Label (e.g. Home)" value={newAddr.label} onChange={(v) => setNewAddr((p) => ({ ...p, label: v }))} />
                          <Field label="Full Name *" value={newAddr.full_name} onChange={(v) => setNewAddr((p) => ({ ...p, full_name: v }))} />
                          <Field label="Phone *" value={newAddr.phone} onChange={(v) => setNewAddr((p) => ({ ...p, phone: v }))} />
                          <Field label="City *" value={newAddr.city} onChange={(v) => setNewAddr((p) => ({ ...p, city: v }))} />
                          <Field label="District / State" value={newAddr.district} onChange={(v) => setNewAddr((p) => ({ ...p, district: v }))} />
                          <Field label="Postal Code" value={newAddr.postal_code} onChange={(v) => setNewAddr((p) => ({ ...p, postal_code: v }))} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                          <Field label="Street Address *" value={newAddr.address_line1} onChange={(v) => setNewAddr((p) => ({ ...p, address_line1: v }))} />
                          <Field label="Address Line 2" value={newAddr.address_line2} onChange={(v) => setNewAddr((p) => ({ ...p, address_line2: v }))} />
                          <Field label="Country *" value={newAddr.country} onChange={(v) => setNewAddr((p) => ({ ...p, country: v }))} />
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                          <button onClick={handleSaveAddress} disabled={savingAddr} style={S.primaryBtn} className="btn-h">
                            {savingAddr ? <><Spinner size={14} /> Saving…</> : "Save Address"}
                          </button>
                          <button onClick={() => { setShowNewAddr(false); setNewAddr(EMPTY_ADDR); setAddrError(null); }} style={S.ghostBtn} className="ghost-h">
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
                      if (!selectedAddrId) { setAddrError("Please select or add a shipping address"); return; }
                      setAddrError(null);
                      setStep("review");
                    }}
                    style={{ ...S.primaryBtn, padding: "14px 32px", fontSize: 15 }}
                    className="btn-h"
                  >
                    Continue to Review →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Review & Confirm ── */}
            {step === "review" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Shipping address summary */}
                {selectedAddr && (
                  <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: BRAND }}>Shipping To</h2>
                      <button onClick={() => setStep("address")} style={{ fontSize: 13, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: FF }}>
                        Change
                      </button>
                    </div>
                    <div style={{ fontSize: 14, color: BRAND, fontWeight: 700, marginBottom: 4 }}>{selectedAddr.full_name}</div>
                    <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                      {selectedAddr.address_line1}{selectedAddr.address_line2 ? `, ${selectedAddr.address_line2}` : ""}<br />
                      {selectedAddr.city}{selectedAddr.district ? `, ${selectedAddr.district}` : ""}
                      {selectedAddr.postal_code ? ` ${selectedAddr.postal_code}` : ""}<br />
                      {selectedAddr.country}
                    </div>
                    <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>{selectedAddr.phone}</div>
                  </div>
                )}

                {/* Order items */}
                <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 24 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px", color: BRAND }}>Order Items ({items.length})</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {items.map((item) => {
                      const img = resolveItemImage(item);
                      return (
                        <div key={item.id} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                          <div style={{ width: 60, height: 60, borderRadius: 12, background: "#F1F5F9", overflow: "hidden", flexShrink: 0 }}>
                            {img ? (
                              <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📦</div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: BRAND, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.product?.title ?? "Product"}
                            </div>
                            {item.variant && (
                              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{item.variant.title}</div>
                            )}
                            {item.product?.brand && (
                              <div style={{ fontSize: 12, color: "#94A3B8" }}>{item.product.brand}</div>
                            )}
                            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Qty: {item.quantity}</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: BRAND, flexShrink: 0 }}>
                            {formatCurrency(item.price * item.quantity)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order notes */}
                <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 10, color: BRAND }}>
                    Order Notes <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special instructions, delivery preferences…"
                    rows={3}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, resize: "vertical", fontFamily: FF, outline: "none" }}
                  />
                </div>

                {/* Payment info banner */}
                <div style={{ padding: "14px 18px", background: "#EFF6FF", borderRadius: 14, border: "1px solid #BFDBFE", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", margin: "0 0 4px", fontFamily: FF }}>Manual Bank Transfer</p>
                    <p style={{ fontSize: 13, color: "#3B82F6", margin: 0, lineHeight: 1.6, fontFamily: FF }}>
                      After confirming, you'll be taken to the payment page where you can transfer funds and upload your proof of payment. Your order will be confirmed once payment is verified.
                    </p>
                  </div>
                </div>

                {/* Error message */}
                {confirmError && (
                  <div style={{ padding: "12px 16px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 12, fontSize: 13, color: "#9F1239", fontFamily: FF }}>
                    ⚠️ {confirmError}
                  </div>
                )}

                {/* ── THE KEY BUTTON ──
                    This does:  POST /api/orders  →  POST /api/payments/{id}  →  redirect
                    PaymentClient finds the pre-created payment via GET /api/payments/my
                    and skips straight to the Transfer step — no creation race condition.
                */}
                <button
                  onClick={handleConfirmOrder}
                  disabled={isConfirming}
                  className="btn-h"
                  style={{
                    padding: "18px", borderRadius: 16, border: "none",
                    background: isConfirming ? "#374151" : BRAND,
                    color: "#fff", fontWeight: 900, fontSize: 17,
                    cursor: isConfirming ? "default" : "pointer",
                    opacity: isConfirming ? 0.85 : 1,
                    transition: "all .2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    fontFamily: FF,
                  }}
                >
                  {isConfirming && <Spinner size={18} />}
                  {confirmLabel}
                </button>

                {/* Phase progress indicator */}
                {isConfirming && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    {[
                      { key: "creating-order", label: "Creating order" },
                      { key: "initiating-payment", label: "Setting up payment" },
                      { key: "redirecting", label: "Redirecting" },
                    ].map((phase, i) => {
                      const phases = ["creating-order", "initiating-payment", "redirecting"];
                      const phaseIndex = phases.indexOf(confirmPhase);
                      const thisIndex = phases.indexOf(phase.key);
                      const done = phaseIndex > thisIndex;
                      const active = phaseIndex === thisIndex;
                      return (
                        <div key={phase.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: active ? BRAND : done ? "#10B981" : "#CBD5E1", fontFamily: FF, fontWeight: active ? 700 : 400 }}>
                          {done ? "✓" : active ? "·" : "○"} {phase.label}
                          {i < 2 && <span style={{ color: "#E2E8F0", margin: "0 2px" }}>→</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", margin: 0, fontFamily: FF }}>
                  By confirming, you agree to our terms of service. Payment is processed manually via bank transfer.
                </p>
              </div>
            )}
          </div>

          {/* ════ RIGHT: ORDER SUMMARY ════ */}
          <div style={{ position: "sticky", top: 100 }}>
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E5E7EB", padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, color: BRAND }}>Order Summary</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, maxHeight: 280, overflowY: "auto" }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
                    <span style={{ color: "#64748B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.product?.title ?? "Item"} × {item.quantity}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0, color: BRAND }}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748B" }}>Subtotal</span>
                  <span style={{ fontWeight: 700, color: BRAND }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748B" }}>Shipping</span>
                  <span style={{ fontWeight: 700, color: "#166534" }}>Free</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #F1F5F9", marginTop: 12, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: BRAND }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: BRAND }}>{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "🔒", text: "Secure checkout" },
                { icon: "🚚", text: "Free delivery" },
                { icon: "↩️", text: "Easy 30-day returns" },
                { icon: "📋", text: "Manual bank transfer payment" },
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

/* ─── Field sub-component ─── */
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 5 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #E2E0DB", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
      />
    </div>
  );
}

/* ─── Shared styles ─── */
const S: Record<string, React.CSSProperties> = {
  primaryBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 22px", borderRadius: 12, border: "none",
    background: BRAND, color: "#fff", fontWeight: 800, fontSize: 14,
    cursor: "pointer", fontFamily: FF, transition: "opacity .15s",
  },
  ghostBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "10px 18px", borderRadius: 10, border: "1px solid #E5E7EB",
    background: "transparent", color: "#475569", fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontFamily: FF, transition: "background .12s",
  },
};