"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { addressesApi, couponsApi, walletApi } from "@/lib/api";
import type { Address, Coupon, Wallet } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();

  const items = cart.items;
  const subtotal = cart.subtotal();

  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);

  // Address management
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    postal_code: "",
  });

  // Coupon management
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discount, setDiscount] = useState(0);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  // Wallet management
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [walletPoints, setWalletPoints] = useState(0);

  const finalTotal = subtotal - discount - (useWallet ? walletPoints : 0);

  /* ================= LOAD USER DATA ================= */

  useEffect(() => {
    loadAddresses();
    loadWallet();
    loadAvailableCoupons();
  }, []);

  async function loadAddresses() {
    try {
      const data = await addressesApi.list();
      setAddresses(data as Address[]);
      
      // Auto-select default address
      const defaultAddr = (data as Address[]).find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (err) {
      console.log("No saved addresses");
    }
  }

  async function loadWallet() {
    try {
      const data = await walletApi.get();
      setWallet(data as Wallet);
    } catch (err) {
      console.log("Wallet not available");
    }
  }

  async function loadAvailableCoupons() {
    try {
      const data = await couponsApi.getAvailable();
      setAvailableCoupons(data as Coupon[]);
    } catch (err) {
      console.log("No available coupons");
    }
  }

  /* ================= APPLY COUPON ================= */

  async function handleApplyCoupon() {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      const result = await couponsApi.apply(couponCode);
      const coupon = result as any;
      
      setAppliedCoupon(coupon);
      
      // Calculate discount
      if (coupon.discount_type === "percentage") {
        const discountAmount = subtotal * (coupon.discount_value / 100);
        setDiscount(Math.min(discountAmount, coupon.max_discount || discountAmount));
      } else {
        setDiscount(coupon.discount_value);
      }
      
      toast.success("Coupon applied!");
      setCouponCode("");
    } catch (err: any) {
      toast.error(err.message || "Invalid coupon code");
    }
  }

  async function handleRemoveCoupon() {
    try {
      await couponsApi.remove();
      setAppliedCoupon(null);
      setDiscount(0);
      toast.success("Coupon removed");
    } catch (err) {
      toast.error("Failed to remove coupon");
    }
  }

  /* ================= WALLET ================= */

  function handleToggleWallet() {
    if (!wallet) return;
    
    if (!useWallet) {
      // Calculate max points user can redeem (typically 1 point = M1)
      const maxRedeemable = Math.min(wallet.balance, Math.floor(finalTotal));
      setWalletPoints(maxRedeemable);
      setUseWallet(true);
    } else {
      setWalletPoints(0);
      setUseWallet(false);
    }
  }

  /* ================= CREATE ADDRESS ================= */

  async function handleCreateAddress() {
    if (!newAddress.full_name || !newAddress.phone || !newAddress.address || !newAddress.city) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const result = await addressesApi.create(newAddress);
      const addr = result as Address;
      
      setAddresses([...addresses, addr]);
      setSelectedAddressId(addr.id);
      setShowNewAddress(false);
      setNewAddress({
        full_name: "",
        phone: "",
        address: "",
        city: "",
        district: "",
        postal_code: "",
      });
      toast.success("Address added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add address");
    }
  }

  /* ================= PLACE ORDER ================= */

  async function handlePlaceOrder() {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) {
      toast.error("Invalid address selected");
      return;
    }

    setPlacing(true);

    try {
      // Redeem wallet points if used
      if (useWallet && walletPoints > 0) {
        await walletApi.redeem(walletPoints);
      }

      const order = await cart.createOrder(selectedAddress);

      router.push(`/order-success?order_id=${order.order_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <h2>Your cart is empty</h2>
        <button
          onClick={() => router.push("/store")}
          className="btn btnPrimary"
          style={{ marginTop: 20 }}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 40 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 40 }}>
        Checkout
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 50 }}>
        {/* ================= LEFT SIDE ================= */}
        <div>
          {/* STEP 1 – SHIPPING */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>
                Shipping Address
              </h2>

              {/* EXISTING ADDRESSES */}
              {addresses.length > 0 && !showNewAddress && (
                <div className="card" style={{ display: "grid", gap: 16 }}>
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: selectedAddressId === addr.id
                          ? "2px solid var(--primary)"
                          : "2px solid #e5e7eb",
                        cursor: "pointer",
                        display: "block",
                      }}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ marginRight: 12 }}
                      />
                      <strong>{addr.full_name}</strong>
                      {addr.is_default && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#dcfce7",
                            color: "#166534",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          Default
                        </span>
                      )}
                      <div style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
                        <div>{addr.phone}</div>
                        <div>{addr.address}</div>
                        <div>
                          {addr.city}
                          {addr.district && `, ${addr.district}`}
                        </div>
                      </div>
                    </label>
                  ))}

                  <button
                    onClick={() => setShowNewAddress(true)}
                    className="btn btnGhost"
                  >
                    + Add New Address
                  </button>

                  <button
                    className="btn btnPrimary"
                    onClick={() => setStep(2)}
                    disabled={!selectedAddressId}
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* NEW ADDRESS FORM */}
              {(showNewAddress || addresses.length === 0) && (
                <div className="card" style={{ display: "grid", gap: 16 }}>
                  <Input
                    placeholder="Full Name *"
                    value={newAddress.full_name}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, full_name: e.target.value })
                    }
                  />

                  <Input
                    placeholder="Phone Number *"
                    value={newAddress.phone}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, phone: e.target.value })
                    }
                  />

                  <Input
                    placeholder="Street Address *"
                    value={newAddress.address}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, address: e.target.value })
                    }
                  />

                  <Input
                    placeholder="City *"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, city: e.target.value })
                    }
                  />

                  <Input
                    placeholder="District"
                    value={newAddress.district}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, district: e.target.value })
                    }
                  />

                  <Input
                    placeholder="Postal Code"
                    value={newAddress.postal_code}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, postal_code: e.target.value })
                    }
                  />

                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={handleCreateAddress} className="btn btnPrimary">
                      Save & Continue
                    </button>

                    {addresses.length > 0 && (
                      <button
                        onClick={() => setShowNewAddress(false)}
                        className="btn btnGhost"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2 – REVIEW & PAYMENT OPTIONS */}
          {step === 2 && (
            <div className="card">
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>
                Review Your Order
              </h2>

              {/* COUPON SECTION */}
              <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: "#f9fafb" }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>
                  🎟️ Have a coupon?
                </h3>

                {!appliedCoupon ? (
                  <div style={{ display: "flex", gap: 12 }}>
                    <input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      style={{ flex: 1, padding: 10, borderRadius: 8 }}
                    />
                    <button onClick={handleApplyCoupon} className="btn btnSecondary">
                      Apply
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: "#dcfce7",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      ✅ <strong>{appliedCoupon.code}</strong> applied (-
                      {formatCurrency(discount)})
                    </span>
                    <button
                      onClick={handleRemoveCoupon}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: "#fee2e2",
                        color: "#991b1b",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Available coupons */}
                {!appliedCoupon && availableCoupons.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
                      Available coupons:
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {availableCoupons.slice(0, 3).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCouponCode(c.code);
                            handleApplyCoupon();
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            background: "white",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {c.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* WALLET SECTION */}
              {wallet && wallet.balance > 0 && (
                <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: "#fef3c7" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>
                    💰 Use Wallet Points
                  </h3>
                  <div style={{ marginBottom: 12 }}>
                    Available: <strong>{wallet.balance} points</strong> (≈{" "}
                    {formatCurrency(wallet.balance)})
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={handleToggleWallet}
                    />
                    <span>
                      Use {walletPoints} points ({formatCurrency(walletPoints)} off)
                    </span>
                  </label>
                </div>
              )}

              {/* ITEMS */}
              {items.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid rgba(0,0,0,0.1)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#16a34a",
                    }}
                  >
                    <span>Discount</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}

                {useWallet && walletPoints > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#f59e0b",
                    }}
                  >
                    <span>Wallet Points</span>
                    <span>-{formatCurrency(walletPoints)}</span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 900,
                    fontSize: 18,
                    paddingTop: 12,
                    borderTop: "2px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <span>Total</span>
                  <span>{formatCurrency(Math.max(0, finalTotal))}</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 30,
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <button className="btn btnGhost" onClick={() => setStep(1)}>
                  Back
                </button>

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="btn btnPrimary"
                >
                  {placing ? "Placing Order..." : "Confirm Order"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= ORDER SUMMARY (RIGHT SIDE) ================= */}
        <div>
          <div className="card">
            <h3 style={{ fontWeight: 900, marginBottom: 20 }}>Order Summary</h3>

            {items.map((item) => (
              <div
                key={item.product_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                <span>
                  {item.title} × {item.quantity}
                </span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid rgba(0,0,0,0.1)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#16a34a",
                  }}
                >
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              {useWallet && walletPoints > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#f59e0b",
                  }}
                >
                  <span>Wallet</span>
                  <span>-{formatCurrency(walletPoints)}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 900,
                  paddingTop: 12,
                  borderTop: "2px solid rgba(0,0,0,0.1)",
                }}
              >
                <span>Total</span>
                <span>{formatCurrency(Math.max(0, finalTotal))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= REUSABLE INPUT ================= */

function Input(props: any) {
  return (
    <input
      {...props}
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        border: "2px solid var(--gray-200)",
        fontSize: 15,
        transition: "all 0.2s ease",
      }}
      onFocus={(e) =>
        (e.currentTarget.style.border = "2px solid var(--primary)")
      }
      onBlur={(e) =>
        (e.currentTarget.style.border = "2px solid var(--gray-200)")
      }
    />
  );
}