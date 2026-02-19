"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { cartApi, ordersApi, addressesApi, couponsApi, walletApi } from "@/lib/api";
import type { Cart, Address, Wallet, Coupon } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

type Step = "address" | "review" | "confirm";

export default function CheckoutPage() {
  const router = useRouter();

  // Data
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  // UI state
  const [step, setStep] = useState<Step>("address");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Selection
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");

  // Address form
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: "Home", full_name: "", phone: "", address_line1: "", address_line2: "",
    city: "", state: "", postal_code: "", country: "Lesotho",
  });
  const [savingAddr, setSavingAddr] = useState(false);

  /* ---- Load everything ---- */
  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      cartApi.get(),
      addressesApi.list(),
      walletApi.get(),
      couponsApi.getAvailable(),
    ]).then(([c, a, w, coupons]) => {
      if (c.status === "fulfilled") setCart(c.value as Cart);
      if (a.status === "fulfilled") {
        const addrs = (a.value as Address[]) ?? [];
        setAddresses(addrs);
        const def = addrs.find((x) => x.is_default);
        if (def) setSelectedAddressId(def.id);
      }
      if (w.status === "fulfilled") setWallet(w.value as Wallet);
      if (coupons.status === "fulfilled") setAvailableCoupons((coupons.value as any) ?? []);
    }).finally(() => setLoading(false));
  }, []);

  /* ---- Computed ---- */
  const subtotal = cart?.subtotal ?? 0;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.min(subtotal * appliedCoupon.discount_value / 100, appliedCoupon.max_discount ?? Infinity)
      : appliedCoupon.discount_value
    : 0;
  const pointsValue = redeemPoints; // 1 point = R1 for simplicity
  const total = Math.max(0, subtotal - couponDiscount - pointsValue);
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  /* ---- Handlers ---- */
  async function handleSaveAddress() {
    if (!addrForm.full_name || !addrForm.phone || !addrForm.address_line1 || !addrForm.city) {
      toast.error("Please fill all required fields");
      return;
    }
    setSavingAddr(true);
    try {
      const newAddr = await addressesApi.create(addrForm) as Address;
      setAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowNewAddress(false);
      toast.success("Address saved!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save address");
    } finally {
      setSavingAddr(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const result = await couponsApi.apply(couponCode, subtotal) as any;
      setAppliedCoupon(result);
      toast.success(`Coupon applied! Saved ${formatCurrency(result.discount_value)}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid coupon code");
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function handleRemoveCoupon() {
    try {
      await couponsApi.remove();
      setAppliedCoupon(null);
      setCouponCode("");
      toast.success("Coupon removed");
    } catch {}
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    if (!cart?.items?.length) {
      toast.error("Your cart is empty");
      return;
    }

    setPlacing(true);
    try {
      const order = await ordersApi.create({
        total_amount: total,
        shipping_address: {
          full_name: selectedAddress.full_name,
          phone: selectedAddress.phone,
          address: selectedAddress.address,
          city: selectedAddress.city,
          district: selectedAddress.district,
          postal_code: selectedAddress.postal_code,
        },
        notes: orderNotes || undefined,
      }) as any;

      toast.success("Order placed!");
      router.push(`/store/payment?order_id=${order.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  /* ---- Loading ---- */
  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
      Loading checkout...
    </div>
  );

  if (!cart?.items?.length) return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
      <div style={{ fontSize: 48 }}>🛒</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Your cart is empty</div>
      <Link href="/store" style={primaryBtnLink}>Continue Shopping</Link>
    </div>
  );

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "32px 0 80px" }}>
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/store/cart" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            ← Back to Cart
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: "#0f172a" }}>Checkout</h1>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 32, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {(["address", "review", "confirm"] as Step[]).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, padding: "14px 16px", textAlign: "center", fontSize: 13, fontWeight: 700,
                background: step === s ? "#0f172a" : "#fff",
                color: step === s ? "#fff" : "#64748b",
                borderRight: i < 2 ? "1px solid #e5e7eb" : "none",
                cursor: "default",
              }}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }}>

          {/* LEFT: Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* STEP 1: ADDRESS */}
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <div style={stepNumber}>1</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Delivery Address</div>
              </div>

              {/* Existing addresses */}
              {addresses.length > 0 && (
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      style={{
                        display: "flex", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 12,
                        border: `2px solid ${selectedAddressId === addr.id ? "#0f172a" : "#e5e7eb"}`,
                        background: selectedAddressId === addr.id ? "#f8fafc" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{addr.full_name}</span>
                          {addr.label && <span style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 8px", borderRadius: 99, color: "#475569", fontWeight: 600 }}>{addr.label}</span>}
                          {addr.is_default && <span style={{ fontSize: 11, background: "#dcfce7", padding: "2px 8px", borderRadius: 99, color: "#166534", fontWeight: 600 }}>Default</span>}
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                          {addr.address}, {addr.city}{addr.district ? `, ${addr.district}` : ""}{addr.postal_code ? ` ${addr.postal_code}` : ""}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>{addr.phone}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Add new address toggle */}
              {!showNewAddress ? (
                <button onClick={() => setShowNewAddress(true)} style={outlineBtnStyle}>
                  + Add New Address
                </button>
              ) : (
                <div style={{ background: "#f8fafc", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, marginTop: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>New Address</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={labelSt}>Label (e.g. Home, Work)</label>
                      <input style={inputSt} value={addrForm.label} onChange={(e) => setAddrForm(f => ({ ...f, label: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelSt}>Full Name *</label>
                      <input style={inputSt} value={addrForm.full_name} onChange={(e) => setAddrForm(f => ({ ...f, full_name: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelSt}>Phone *</label>
                      <input style={inputSt} value={addrForm.phone} onChange={(e) => setAddrForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={labelSt}>Address Line 1 *</label>
                      <input style={inputSt} value={addrForm.address_line1} onChange={(e) => setAddrForm(f => ({ ...f, address_line1: e.target.value }))} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={labelSt}>Address Line 2</label>
                      <input style={inputSt} value={addrForm.address_line2} onChange={(e) => setAddrForm(f => ({ ...f, address_line2: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelSt}>City *</label>
                      <input style={inputSt} value={addrForm.city} onChange={(e) => setAddrForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelSt}>Postal Code</label>
                      <input style={inputSt} value={addrForm.postal_code} onChange={(e) => setAddrForm(f => ({ ...f, postal_code: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={handleSaveAddress} disabled={savingAddr} style={primaryBtnStyle}>
                      {savingAddr ? "Saving..." : "Save Address"}
                    </button>
                    <button onClick={() => setShowNewAddress(false)} style={outlineBtnStyle}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: DISCOUNTS */}
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <div style={stepNumber}>2</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Discounts & Savings</div>
              </div>

              {/* Coupon */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelSt}>Coupon Code</label>
                {appliedCoupon ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>
                      🎉 {appliedCoupon.code} — {formatCurrency(couponDiscount)} off
                    </span>
                    <button onClick={handleRemoveCoupon} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Remove</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...inputSt, flex: 1 }}
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    />
                    <button onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode} style={{ ...primaryBtnStyle, opacity: !couponCode ? 0.6 : 1 }}>
                      {applyingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                )}

                {/* Available coupons */}
                {availableCoupons.length > 0 && !appliedCoupon && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Available coupons:</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {availableCoupons.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCouponCode(c.code); }}
                          style={{ padding: "4px 10px", borderRadius: 8, border: "1px dashed #0f172a", background: "#f8fafc", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                        >
                          {c.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet / points */}
              {wallet && wallet.balance > 0 && (
                <div>
                  <label style={labelSt}>Redeem Loyalty Points</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="range"
                      min={0}
                      max={Math.min(wallet.balance, total)}
                      value={redeemPoints}
                      onChange={(e) => setRedeemPoints(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", minWidth: 80, textAlign: "right" }}>
                      {redeemPoints > 0 ? `−${formatCurrency(redeemPoints)}` : "None"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Balance: {formatCurrency(wallet.balance)} · Drag to use points as cash
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: NOTES */}
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <div style={stepNumber}>3</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Order Notes <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>(optional)</span></div>
              </div>
              <textarea
                style={{ ...inputSt, height: 80, resize: "vertical" }}
                placeholder="Special instructions, delivery notes, etc."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>
          </div>

          {/* RIGHT: Order Summary */}
          <div style={{ position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...sectionCard, padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>Order Summary</div>

              {/* Items */}
              <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                {cart.items.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f1f5f9", overflow: "hidden", flexShrink: 0 }}>
                      {item.product?.main_image && (
                        <img src={item.product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.product?.title ?? "Product"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {item.variant?.title ? `${item.variant.title} · ` : ""}Qty: {item.quantity}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, display: "grid", gap: 8 }}>
                <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
                {couponDiscount > 0 && <SummaryRow label={`Coupon (${appliedCoupon.code})`} value={`−${formatCurrency(couponDiscount)}`} color="#166534" />}
                {redeemPoints > 0 && <SummaryRow label="Points Redeemed" value={`−${formatCurrency(redeemPoints)}`} color="#166534" />}
                <SummaryRow label="Shipping" value="Free" color="#166534" />
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: "#0f172a" }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery address preview */}
            {selectedAddress && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 8, textTransform: "uppercase" }}>Delivering to</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selectedAddress.full_name}</div>
                <div style={{ fontSize: 13, color: "#475569" }}>{selectedAddress.address}, {selectedAddress.city}</div>
                <div style={{ fontSize: 13, color: "#475569" }}>{selectedAddress.phone}</div>
              </div>
            )}

            {/* Place order */}
            <button
              onClick={handlePlaceOrder}
              disabled={placing || !selectedAddressId}
              style={{
                padding: "16px", borderRadius: 14, border: "none",
                background: selectedAddressId ? "#0f172a" : "#94a3b8",
                color: "#fff", fontWeight: 900, fontSize: 16,
                cursor: selectedAddressId ? "pointer" : "not-allowed",
                opacity: placing ? 0.7 : 1,
              }}
            >
              {placing ? "Placing Order..." : `Place Order · ${formatCurrency(total)}`}
            </button>

            <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: 0 }}>
              By placing this order you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? "#0f172a" }}>{value}</span>
    </div>
  );
}

/* ---- Styles ---- */
const sectionCard: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 };
const sectionHeader: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", marginBottom: 20 };
const stepNumber: React.CSSProperties = { width: 28, height: 28, borderRadius: "50%", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, flexShrink: 0 };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box", outline: "none", background: "#fff" };
const labelSt: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const primaryBtnStyle: React.CSSProperties = { padding: "10px 20px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const primaryBtnLink: React.CSSProperties = { padding: "12px 24px", borderRadius: 12, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 };
const outlineBtnStyle: React.CSSProperties = { padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#475569" };