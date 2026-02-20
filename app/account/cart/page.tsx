"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cartApi, productsApi, wishlistApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import type { Cart, CartItem } from "@/lib/types";

/* ─── Design tokens ─── */
const FF    = "'DM Sans', -apple-system, sans-serif";
const BRAND = "#0F172A";
const BLUE  = "#0033A0";
const GREEN = "#15803D";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
.ac-root * { box-sizing: border-box; }
.ac-item {
  background:#fff; border-bottom:1px solid #F1F5F9;
  padding:16px 0; display:flex; gap:14px; align-items:flex-start;
  transition:background 0.15s; position:relative;
}
.ac-item:last-child { border-bottom:none; }
.ac-item:hover { background:#FAFAFA; }
.ac-item.removing { animation:acSlideOut 0.25s ease forwards; pointer-events:none; overflow:hidden; }
@keyframes acSlideOut { to { opacity:0; max-height:0; padding:0; margin:0; } }
.ac-step-btn {
  width:30px; height:30px; border-radius:6px; border:1.5px solid #E2E8F0;
  background:#F8FAFC; font-size:16px; font-weight:700; cursor:pointer;
  display:grid; place-items:center; transition:all 0.15s; font-family:inherit; flex-shrink:0;
}
.ac-step-btn:hover:not(:disabled) { background:${BLUE}; color:#fff; border-color:${BLUE}; }
.ac-step-btn:disabled { opacity:0.3; cursor:not-allowed; }
.ac-act-btn {
  background:none; border:none; color:${BLUE}; font-size:12px; font-weight:600;
  cursor:pointer; font-family:inherit; padding:2px 0; text-decoration:none;
  display:inline-flex; align-items:center; gap:3px; transition:color 0.15s;
}
.ac-act-btn:hover { color:#C0392B; text-decoration:underline; }
.ac-divider { width:1px; height:12px; background:#E2E8F0; margin:0 8px; flex-shrink:0; }
.ac-tag-sale  { background:#FFF0F0; border:1px solid #FECACA; color:#DC2626; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:800; display:inline-flex; }
.ac-tag-stock { background:#FFF7ED; border:1px solid #FED7AA; color:#C2410C; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:700; display:inline-flex; }
.ac-tag-free  { background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:700; display:inline-flex; }
.ac-checkout-btn {
  width:100%; padding:13px; border-radius:22px; border:none;
  background:linear-gradient(180deg,#0047D4 0%,#0033A0 100%);
  color:#fff; font-family:inherit; font-weight:800; font-size:14px;
  cursor:pointer; transition:all 0.2s; letter-spacing:0.2px;
  box-shadow:0 2px 8px rgba(0,51,160,0.25);
}
.ac-checkout-btn:hover { box-shadow:0 6px 20px rgba(0,51,160,0.4); transform:translateY(-1px); }
.ac-checkout-btn:active { transform:translateY(0); }
.ac-prog-track { height:5px; background:#E2E8F0; border-radius:99px; overflow:hidden; margin:8px 0; }
.ac-prog-fill  { height:100%; background:linear-gradient(90deg,#009543,#00B84C); border-radius:99px; transition:width 0.5s cubic-bezier(0.4,0,0.2,1); }
.ac-skel { background:linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%); background-size:200% 100%; animation:shimmer 1.3s infinite; border-radius:6px; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.ac-check { width:16px; height:16px; border:2px solid #CBD5E1; border-radius:3px; background:#fff; cursor:pointer; flex-shrink:0; appearance:none; -webkit-appearance:none; transition:all 0.15s; display:grid; place-items:center; margin-top:2px; }
.ac-check:checked { background:${BLUE}; border-color:${BLUE}; }
.ac-check:checked::after { content:'✓'; color:#fff; font-size:10px; font-weight:900; }
@media(max-width:768px){
  .ac-grid { grid-template-columns:1fr !important; }
  .ac-summary-col { position:static !important; }
  .ac-line-price { display:none !important; }
}
`;

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width:72, height:72, borderRadius:8, background:"#F1F5F9", display:"grid", placeItems:"center", fontSize:26, flexShrink:0, border:"1px solid #E2E8F0" }}>📦</div>
  );
  return (
    <img src={src} alt={alt} onError={() => setErr(true)}
      style={{ width:72, height:72, borderRadius:8, objectFit:"cover", flexShrink:0, border:"1px solid #F1F5F9" }}
    />
  );
}

export default function AccountCartPage() {
  const router        = useRouter();
  const syncZustand   = useCart((s) => s.fetchCart);

  const [cart,       setCart]       = useState<Cart | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearing,   setClearing]   = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Load + Enrich ── */
  async function loadCart() {
    try {
      const data = await cartApi.get() as Cart;
      const items = data?.items ?? [];

      // Enrich items missing product data (for images/details)
      const bare = items.filter(i => !i.product && i.product_id);
      if (bare.length > 0) {
        const results = await Promise.allSettled(bare.map(i => productsApi.get(i.product_id)));
        const map: Record<string, any> = {};
        bare.forEach((item, idx) => {
          const r = results[idx];
          if (r.status === "fulfilled") map[item.product_id] = r.value;
        });
        data.items = items.map(i => (!i.product && map[i.product_id]) ? { ...i, product: map[i.product_id] } : i);
      }

      setCart(data);
      setSelected(new Set(data.items.map(i => i.id)));
    } catch { setCart(null); }
    finally  { setLoading(false); }
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQty(itemId: string, qty: number) {
    if (qty < 1) return;
    setUpdatingId(itemId);
    try {
      await cartApi.updateItem(itemId, { quantity: qty });
      setCart(prev => prev ? ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, quantity: qty } : i) }) : prev);
      syncZustand();
    } catch (e: any) { showToast(e?.message ?? "Failed to update", false); loadCart(); }
    finally           { setUpdatingId(null); }
  }

  async function removeItem(itemId: string) {
    setRemovingId(itemId);
    await new Promise(r => setTimeout(r, 250));
    try {
      await cartApi.removeItem(itemId);
      setCart(prev => prev ? ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }) : prev);
      setSelected(prev => { const n = new Set(prev); n.delete(itemId); return n; });
      syncZustand();
      showToast("Item removed from cart");
    } catch (e: any) { showToast(e?.message ?? "Failed", false); loadCart(); }
    finally           { setRemovingId(null); }
  }

  async function moveToWishlist(item: CartItem) {
    if (!item.product_id) return;
    setRemovingId(item.id);
    await new Promise(r => setTimeout(r, 250));
    try {
      await wishlistApi.add(item.product_id);
      await cartApi.removeItem(item.id);
      setCart(prev => prev ? ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }) : prev);
      setSelected(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      syncZustand();
      showToast("Saved to wishlist ❤️");
    } catch (e: any) { showToast(e?.message ?? "Failed", false); }
    finally           { setRemovingId(null); }
  }

  async function clearCart() {
    if (!confirm("Remove all items from your cart?")) return;
    setClearing(true);
    try {
      await cartApi.clear();
      setCart(prev => prev ? ({ ...prev, items: [] }) : prev);
      setSelected(new Set());
      syncZustand();
      showToast("Cart cleared");
    } catch (e: any) { showToast(e?.message ?? "Failed", false); }
    finally           { setClearing(false); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  /* ── Derived ── */
  const items    = cart?.items ?? [];
  const selItems = items.filter(i => selected.has(i.id));
  const subtotal = selItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalQty = selItems.reduce((s, i) => s + i.quantity, 0);
  const savings  = selItems.reduce((s, i) => {
    const cp = i.product?.compare_price ?? 0;
    return s + (cp > i.price ? (cp - i.price) * i.quantity : 0);
  }, 0);
  const FREE_SHIP = 500;
  const progress  = Math.min((subtotal / FREE_SHIP) * 100, 100);
  const toFree    = Math.max(FREE_SHIP - subtotal, 0);

  /* ── Skeleton ── */
  if (loading) return (
    <div className="ac-root" style={{ fontFamily: FF }}>
      <style>{STYLES}</style>
      <div style={{ maxWidth: 860 }}>
        <div className="ac-skel" style={{ height: 28, width: 160, marginBottom: 20 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }} className="ac-grid">
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #E2E8F0" }}>
            {[1,2,3].map(k => (
              <div key={k} style={{ display: "flex", gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
                <div className="ac-skel" style={{ width: 72, height: 72, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="ac-skel" style={{ height: 14, width: "65%" }} />
                  <div className="ac-skel" style={{ height: 12, width: "35%" }} />
                  <div className="ac-skel" style={{ height: 18, width: "25%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="ac-skel" style={{ height: 280, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );

  /* ── Empty ── */
  if (items.length === 0) return (
    <div className="ac-root" style={{ fontFamily: FF }}>
      <style>{STYLES}</style>
      <div style={{ maxWidth: 860 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: BRAND, marginBottom: 20 }}>My Cart</h1>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: BRAND, margin: "0 0 8px" }}>Your cart is empty</h2>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>Add items from the store to see them here.</p>
          <button onClick={() => router.push("/store")}
            style={{ padding: "12px 28px", borderRadius: 22, border: "none", background: `linear-gradient(180deg,#0047D4,${BLUE})`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: FF }}>
            Browse Products
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ac-root" style={{ fontFamily: FF }}>
      <style>{STYLES}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, background: toast.ok ? BRAND : "#DC2626", color: "#fff", padding: "10px 18px", borderRadius: 10, fontWeight: 600, fontSize: 13, fontFamily: FF, boxShadow: "0 4px 20px rgba(0,0,0,.25)", animation: "acSlideOut 0s" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 860 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: BRAND, margin: 0 }}>
            My Cart
            <span style={{ fontSize: 15, fontWeight: 400, color: "#64748B", marginLeft: 8 }}>
              ({items.length} item{items.length !== 1 ? "s" : ""})
            </span>
          </h1>
          <button onClick={clearCart} disabled={clearing}
            style={{ background: "none", border: "none", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FF, opacity: clearing ? 0.5 : 1 }}>
            {clearing ? "Clearing…" : "Delete all items"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }} className="ac-grid">

          {/* ═══ ITEMS COLUMN ═══ */}
          <div>

            {/* Select-all row */}
            <div style={{ background: "#fff", borderRadius: "12px 12px 0 0", border: "1px solid #E2E8F0", borderBottom: "1px solid #F1F5F9", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" className="ac-check"
                checked={selected.size === items.length && items.length > 0}
                onChange={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map(i => i.id)))}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                {selected.size === items.length ? "Deselect all" : `Select all (${items.length} items)`}
              </span>
              {selected.size > 0 && selected.size < items.length && (
                <span style={{ fontSize: 12, color: "#64748B" }}>· {selected.size} selected</span>
              )}
            </div>

            {/* Items */}
            <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", border: "1px solid #E2E8F0", borderTop: "none", padding: "0 16px" }}>
              {items.map((item) => {
                const p        = item.product;
                const imgSrc   = p?.main_image ?? (p?.images as any)?.[0]?.image_url ?? item.variant?.image_url ?? null;
                const maxStock = item.variant?.stock ?? p?.stock ?? 99;
                const cprice   = p?.compare_price;
                const savePct  = cprice && cprice > item.price ? Math.round((1 - item.price / cprice) * 100) : 0;
                const lowStock = maxStock <= 5;
                const isUpd    = updatingId === item.id;
                const isRem    = removingId === item.id;

                return (
                  <div key={item.id} className={`ac-item${isRem ? " removing" : ""}`} style={{ opacity: isUpd ? 0.6 : 1 }}>

                    {/* Checkbox */}
                    <input type="checkbox" className="ac-check"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      style={{ marginTop: 4 }}
                    />

                    {/* Image */}
                    <Link href={`/store/product/${item.product_id}`} style={{ flexShrink: 0 }}>
                      <Thumb src={imgSrc} alt={p?.title ?? item.product_id} />
                    </Link>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Title */}
                      <Link href={`/store/product/${item.product_id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: BRAND, lineHeight: 1.4, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
                          {p?.title ?? "Product"}
                        </div>
                      </Link>

                      {/* Variant / Brand */}
                      {item.variant && (
                        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 3 }}>
                          Variant: <strong>{item.variant.title}</strong>
                        </div>
                      )}
                      {p?.brand && (
                        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
                          Brand: <strong style={{ color: BLUE }}>{p.brand}</strong>
                        </div>
                      )}

                      {/* Tags */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                        {savePct > 0 && <span className="ac-tag-sale">-{savePct}% OFF</span>}
                        {lowStock && <span className="ac-tag-stock">⚡ Only {maxStock} left</span>}
                        <span className="ac-tag-free">✓ Free Delivery</span>
                      </div>

                      {/* Price row */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: BRAND }}>{formatCurrency(item.price)}</span>
                        {cprice && cprice > item.price && (
                          <span style={{ fontSize: 12, color: "#94A3B8", textDecoration: "line-through" }}>{formatCurrency(cprice)}</span>
                        )}
                        {item.quantity > 1 && (
                          <span style={{ fontSize: 12, color: "#64748B" }}>× {item.quantity} = <strong>{formatCurrency(item.price * item.quantity)}</strong></span>
                        )}
                      </div>

                      {/* Qty stepper */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as any, letterSpacing: 0.5, marginRight: 2 }}>Qty:</div>
                        <button className="ac-step-btn" onClick={() => updateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1 || !!updatingId}>−</button>
                        <span style={{ minWidth: 28, textAlign: "center", fontWeight: 800, fontSize: 14, color: BRAND }}>{item.quantity}</span>
                        <button className="ac-step-btn" onClick={() => updateQty(item.id, item.quantity + 1)} disabled={item.quantity >= maxStock || !!updatingId}>+</button>
                      </div>

                      {/* Action links */}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" as any }}>
                        <button className="ac-act-btn" onClick={() => removeItem(item.id)} disabled={isRem}>
                          {isRem ? "Removing…" : "Delete"}
                        </button>
                        <span className="ac-divider" />
                        <button className="ac-act-btn" onClick={() => moveToWishlist(item)}>
                          Save for later
                        </button>
                        <span className="ac-divider" />
                        <Link href={`/store/product/${item.product_id}`} className="ac-act-btn">
                          See product
                        </Link>
                      </div>
                    </div>

                    {/* Line price (desktop) */}
                    <div className="ac-line-price" style={{ flexShrink: 0, textAlign: "right", minWidth: 70, paddingTop: 4 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, color: BRAND }}>{formatCurrency(item.price * item.quantity)}</div>
                      {savePct > 0 && <div style={{ fontSize: 10, color: "#DC2626", fontWeight: 700, marginTop: 2 }}>-{savePct}%</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subtotal bar */}
            <div style={{ marginTop: 10, background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Subtotal ({totalQty} item{totalQty !== 1 ? "s" : ""}):</span>
              <span style={{ fontWeight: 900, fontSize: 20, color: BRAND }}>{formatCurrency(subtotal)}</span>
              {savings > 0 && <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 700 }}>(You save {formatCurrency(savings)})</span>}
            </div>
          </div>

          {/* ═══ SUMMARY COLUMN ═══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="ac-summary-col">

            {/* Free shipping progress */}
            {toFree > 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: BRAND, marginBottom: 2 }}>
                  🚚 Add <span style={{ color: BLUE }}>{formatCurrency(toFree)}</span> for FREE delivery
                </div>
                <div className="ac-prog-track">
                  <div className="ac-prog-fill" style={{ width: `${progress}%` }} />
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{Math.round(progress)}% to free shipping</div>
              </div>
            ) : (
              <div style={{ background: "#F0FDF4", borderRadius: 12, border: "1px solid #BBF7D0", padding: "11px 14px", fontSize: 13, fontWeight: 700, color: GREEN }}>
                ✓ Your order qualifies for FREE delivery!
              </div>
            )}

            {/* Summary card */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 18, position: "sticky", top: 80 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: BRAND, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F1F5F9" }}>
                Order Summary
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Items ({totalQty})</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(subtotal + savings)}</span>
                </div>
                {savings > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#DC2626" }}>Discount</span>
                    <span style={{ fontWeight: 700, color: "#DC2626" }}>−{formatCurrency(savings)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748B" }}>Delivery</span>
                  <span style={{ fontWeight: 700, color: toFree === 0 ? GREEN : "#64748B" }}>
                    {toFree === 0 ? "FREE" : "Calculated at checkout"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 14px", borderTop: "2px solid #F1F5F9", borderBottom: "1px solid #F1F5F9", marginBottom: 14 }}>
                <span style={{ fontWeight: 900, fontSize: 14, color: BRAND }}>Order Total:</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: BRAND }}>{formatCurrency(subtotal)}</span>
              </div>

              {savings > 0 && (
                <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "7px 10px", marginBottom: 12, fontSize: 11, fontWeight: 700, color: "#C2410C", textAlign: "center" as any }}>
                  🎉 You're saving {formatCurrency(savings)} on this order!
                </div>
              )}

              <button className="ac-checkout-btn" onClick={() => router.push("/store/checkout")}>
                Proceed to Checkout ({totalQty})
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "center" }}>
                <svg width="11" height="13" viewBox="0 0 12 14" fill="none"><rect x="1" y="5" width="10" height="8" rx="2" stroke="#94A3B8" strokeWidth="1.5"/><path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="#94A3B8" strokeWidth="1.5"/></svg>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>Secure checkout · SSL encrypted</span>
              </div>

              <Link href="/store" style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 12, color: BLUE, fontWeight: 600, textDecoration: "none" }}>
                ← Continue Shopping
              </Link>

              {/* Payment methods */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
                {["Visa", "MC", "EFT", "Cash"].map(m => (
                  <div key={m} style={{ padding: "3px 7px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 4, fontSize: 9, fontWeight: 800, color: "#64748B" }}>{m}</div>
                ))}
              </div>

              {/* Trust badges */}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  "30-day easy returns",
                  "Genuine products guaranteed",
                  "Support 7 days a week",
                ].map(t => (
                  <div key={t} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#64748B" }}>
                    <span style={{ color: GREEN, fontWeight: 900, fontSize: 12 }}>✓</span>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}