"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cartApi, wishlistApi, productsApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { Cart, CartItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ─── STYLES ─────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');

.kc-root { font-family:'DM Sans',sans-serif; background:#f0ede8; min-height:100vh; }

/* ── ITEM CARD ── */
.kc-item {
  background:#fff;
  border-bottom: 1px solid #e8e4de;
  padding: 16px 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  transition: background 0.15s;
  position: relative;
}
.kc-item:first-child { border-radius: 12px 12px 0 0; }
.kc-item:last-child  { border-radius: 0 0 12px 12px; border-bottom: none; }
.kc-item:only-child  { border-radius: 12px; border-bottom: none; }
.kc-item:hover       { background: #fafaf8; }
.kc-item.removing    { animation: slideOut 0.28s ease forwards; pointer-events:none; }
@keyframes slideOut  { to { opacity:0; transform:translateX(20px); max-height:0; padding:0; overflow:hidden; } }

/* ── IMAGE ── */
.kc-img-box {
  width: 120px; min-width: 120px; height: 120px;
  border-radius: 8px;
  border: 1px solid #e8e4de;
  background: #f8f7f4;
  overflow: hidden;
  flex-shrink: 0;
}
.kc-img-box img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
.kc-item:hover .kc-img-box img { transform:scale(1.04); }

/* ── QTY STEPPER ── */
.kc-stepper {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid #d6d1ca;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  height: 34px;
}
.kc-step-btn {
  width: 34px; height: 34px;
  background: #f4f2ee;
  border: none;
  border-right: 1.5px solid #d6d1ca;
  font-size: 18px;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.15s, color 0.15s;
  line-height: 1;
  font-family: inherit;
  flex-shrink: 0;
}
.kc-step-btn:last-child { border-right: none; border-left: 1.5px solid #d6d1ca; }
.kc-step-btn:hover:not(:disabled) { background: #0033a0; color: #fff; }
.kc-step-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.kc-step-num {
  min-width: 40px;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  font-family: inherit;
  height: 34px;
  display: grid;
  place-items: center;
  padding: 0 4px;
}
.kc-step-spin .kc-step-num { opacity: 0.4; }

/* ── ACTION LINKS (like Amazon) ── */
.kc-actions-row {
  display: flex;
  gap: 0;
  align-items: center;
  margin-top: 10px;
  flex-wrap: wrap;
}
.kc-act-btn {
  background: none;
  border: none;
  color: #0033a0;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
  transition: color 0.15s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.kc-act-btn:hover { color: #c0392b; text-decoration: underline; }
.kc-act-divider {
  width: 1px; height: 14px;
  background: #d6d1ca;
  margin: 0 10px;
  flex-shrink: 0;
}

/* ── BADGE TAGS ── */
.kc-tag-sale  { display:inline-flex; align-items:center; background:#fff0f0; border:1px solid #fecaca; color:#dc2626; border-radius:5px; padding:1px 7px; font-size:11px; font-weight:800; }
.kc-tag-stock { display:inline-flex; align-items:center; background:#fff7ed; border:1px solid #fed7aa; color:#c2410c; border-radius:5px; padding:1px 7px; font-size:11px; font-weight:700; }
.kc-tag-free  { display:inline-flex; align-items:center; background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; border-radius:5px; padding:1px 7px; font-size:11px; font-weight:700; }

/* ── CHECKBOX ── */
.kc-check {
  width:18px; height:18px;
  border:2px solid #d6d1ca;
  border-radius:4px;
  background:#fff;
  cursor:pointer;
  flex-shrink:0;
  margin-top:2px;
  appearance:none;
  -webkit-appearance:none;
  transition:all 0.15s;
  display:grid;
  place-items:center;
}
.kc-check:checked { background:#0033a0; border-color:#0033a0; }
.kc-check:checked::after { content:'✓'; color:#fff; font-size:11px; font-weight:900; }

/* ── SUMMARY CARD ── */
.kc-summary {
  background:#fff;
  border-radius:12px;
  border:1px solid #e8e4de;
  padding:20px;
  position:sticky;
  top:80px;
}

/* ── CHECKOUT BTN ── */
.kc-checkout {
  width:100%;
  padding:13px;
  border-radius:24px;
  border:none;
  background:linear-gradient(180deg,#0047d4 0%,#0033a0 100%);
  color:#fff;
  font-family:inherit;
  font-weight:800;
  font-size:15px;
  cursor:pointer;
  box-shadow:0 2px 8px rgba(0,51,160,0.25);
  transition:all 0.2s;
  letter-spacing:0.2px;
}
.kc-checkout:hover { box-shadow:0 6px 20px rgba(0,51,160,0.4); transform:translateY(-1px); }
.kc-checkout:active { transform:translateY(0); }

/* ── PROGRESS BAR ── */
.kc-prog-track { height:6px; background:#e8e4de; border-radius:99px; overflow:hidden; margin:8px 0; }
.kc-prog-fill  { height:100%; background:linear-gradient(90deg,#009543,#00b84c); border-radius:99px; transition:width 0.5s cubic-bezier(0.4,0,0.2,1); }

/* ── SKELETON ── */
.kc-skel {
  background:linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%);
  background-size:200% 100%;
  animation:shimmer 1.3s infinite;
  border-radius:6px;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* ── HEADER BADGE ── */
.kc-hdr-badge {
  min-width:18px; height:18px;
  padding:0 5px;
  background:#dc2626;
  border-radius:99px;
  color:#fff;
  font-size:10px;
  font-weight:900;
  display:grid;
  place-items:center;
  position:absolute;
  top:-7px; right:-7px;
}
.kc-hdr-badge.bump { animation:kcbump 0.35s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes kcbump { 0%{transform:scale(1)} 50%{transform:scale(1.8)} 100%{transform:scale(1)} }

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .kc-grid { grid-template-columns:1fr !important; }
  .kc-summary { position:static !important; }
}
@media(max-width:600px){
  .kc-img-box { width:80px !important; min-width:80px !important; height:80px !important; }
  .kc-item { padding:12px 14px !important; gap:12px !important; }
  .kc-line-price { display:none !important; }
}
`;

/* ─── EXPORTED HEADER BADGE (import in Header.tsx) ─────────── */
export function CartHeaderButton({ onClick }: { onClick?: () => void }) {
  const count = useCart((s) => s.itemCount);
  const prev  = useRef(count);
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    if (count > prev.current) { setBumping(true); setTimeout(() => setBumping(false), 360); }
    prev.current = count;
  }, [count]);

  return (
    <button
      onClick={onClick}
      style={{ padding:"9px 14px", borderRadius:999, fontWeight:700, fontSize:13,
        color:"#fff", background:"rgba(0,0,0,0.65)", border:"1px solid rgba(255,255,255,.15)",
        cursor:"pointer", whiteSpace:"nowrap", transition:"0.2s ease", position:"relative",
        display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      Cart
      {count > 0 && (
        <span className={`kc-hdr-badge${bumping ? " bump" : ""}`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function CartPage() {
  const router      = useRouter();
  const fetchZustand = useCart((s) => s.fetchCart);

  const [cart,       setCart]       = useState<Cart | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearing,   setClearing]   = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());

  /* ── load + enrich ── */
  async function loadCart() {
    try {
      const data = await cartApi.get() as Cart;
      const items = data?.items ?? [];
      const bare  = items.filter(i => !i.product && i.product_id);
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

  const sync = () => fetchZustand();

  async function updateQty(itemId: string, qty: number) {
    if (qty < 1) return;
    setUpdatingId(itemId);
    try {
      await cartApi.updateItem(itemId, { quantity: qty });
      setCart(prev => prev ? ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, quantity: qty } : i),
      }) : prev);
      await sync();
    } catch (e: any) { toast.error(e?.message ?? "Failed to update"); loadCart(); }
    finally           { setUpdatingId(null); }
  }

  async function removeItem(itemId: string) {
    setRemovingId(itemId);
    await new Promise(r => setTimeout(r, 260));
    try {
      await cartApi.removeItem(itemId);
      setCart(prev => prev ? ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      }) : prev);
      setSelected(prev => { const n = new Set(prev); n.delete(itemId); return n; });
      await sync();
      toast.success("Removed from cart");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); loadCart(); }
    finally           { setRemovingId(null); }
  }

  async function clearCart() {
    if (!confirm("Remove all items from your cart?")) return;
    setClearing(true);
    try {
      await cartApi.clear();
      setCart(prev => prev ? ({ ...prev, items: [] }) : prev);
      setSelected(new Set());
      await sync();
      toast.success("Cart cleared");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally           { setClearing(false); }
  }

  async function moveToWishlist(item: CartItem) {
    if (!item.product_id) return;
    setRemovingId(item.id);
    await new Promise(r => setTimeout(r, 260));
    try {
      await wishlistApi.add(item.product_id);
      await cartApi.removeItem(item.id);
      setCart(prev => prev ? ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }) : prev);
      setSelected(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      await sync();
      toast.success("Saved to wishlist");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); setRemovingId(null); }
    finally           { setRemovingId(null); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  /* ── derived ── */
  const items     = cart?.items ?? [];
  const selItems  = items.filter(i => selected.has(i.id));
  const subtotal  = selItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalQty  = selItems.reduce((s, i) => s + i.quantity, 0);
  const savings   = selItems.reduce((s, i) => {
    const cp = i.product?.compare_price ?? 0;
    return s + (cp > i.price ? (cp - i.price) * i.quantity : 0);
  }, 0);
  const FREE_SHIP = 100;
  const progress  = Math.min((subtotal / FREE_SHIP) * 100, 100);
  const toFree    = Math.max(FREE_SHIP - subtotal, 0);

  /* ── SKELETON ── */
  if (loading) return (
    <>
      <style>{STYLES}</style>
      <div className="kc-root" style={{ padding:"32px 16px 80px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="kc-skel" style={{ height:32, width:220, marginBottom:24 }} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }} className="kc-grid">
            <div style={{ background:"#fff", borderRadius:12, overflow:"hidden" }}>
              {[1,2,3].map(k => (
                <div key={k} style={{ padding:"16px 20px", display:"flex", gap:16, borderBottom:"1px solid #f0ede8" }}>
                  <div className="kc-skel" style={{ width:120, height:120, borderRadius:8, flexShrink:0 }} />
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                    <div className="kc-skel" style={{ height:16, width:"70%" }} />
                    <div className="kc-skel" style={{ height:14, width:"40%" }} />
                    <div className="kc-skel" style={{ height:20, width:"25%" }} />
                    <div className="kc-skel" style={{ height:34, width:130 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="kc-skel" style={{ height:320, borderRadius:12 }} />
          </div>
        </div>
      </div>
    </>
  );

  /* ── EMPTY ── */
  if (items.length === 0) return (
    <>
      <style>{STYLES}</style>
      <div className="kc-root" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"70vh", padding:32, textAlign:"center", gap:20 }}>
        <div style={{ width:96, height:96, borderRadius:"50%", background:"#fff", border:"2px solid #e8e4de", display:"grid", placeItems:"center", fontSize:40, boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}>
          🛒
        </div>
        <div>
          <h2 style={{ fontWeight:900, fontSize:24, margin:"0 0 8px", color:"#0f172a" }}>Your cart is empty</h2>
          <p style={{ color:"#64748b", margin:0, fontSize:15 }}>Add items to get started.</p>
        </div>
        <Link href="/store" style={{ padding:"13px 32px", borderRadius:99, background:"linear-gradient(180deg,#0047d4,#0033a0)", color:"#fff", textDecoration:"none", fontWeight:800, fontSize:15, boxShadow:"0 4px 16px rgba(0,51,160,0.3)" }}>
          Browse Products
        </Link>
      </div>
    </>
  );

  /* ── MAIN ── */
  return (
    <>
      <style>{STYLES}</style>
      <div className="kc-root" style={{ padding:"28px 16px 80px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>

          {/* PAGE TITLE */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16, flexWrap:"wrap", gap:8 }}>
            <h1 style={{ fontWeight:900, fontSize:26, margin:0, color:"#0f172a", letterSpacing:-0.5 }}>
              Shopping Cart
              <span style={{ fontWeight:400, fontSize:16, color:"#64748b", marginLeft:10 }}>
                ({items.length} item{items.length !== 1 ? "s" : ""})
              </span>
            </h1>
            <button
              onClick={clearCart}
              disabled={clearing}
              style={{ background:"none", border:"none", color:"#dc2626", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:clearing ? 0.6 : 1 }}
            >
              {clearing ? "Clearing…" : "Delete all items"}
            </button>
          </div>

          {/* GRID */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, alignItems:"start" }} className="kc-grid">

            {/* ═══ ITEMS COLUMN ═══ */}
            <div>
              {/* Select-all header */}
              <div style={{ background:"#fff", borderRadius:"12px 12px 0 0", borderBottom:"1px solid #e8e4de", padding:"10px 20px", display:"flex", alignItems:"center", gap:10 }}>
                <input
                  type="checkbox"
                  className="kc-check"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map(i => i.id)))}
                  title="Select all"
                />
                <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>
                  {selected.size === items.length ? "Deselect all" : `Select all (${items.length} items)`}
                </span>
                {selected.size > 0 && selected.size < items.length && (
                  <span style={{ fontSize:12, color:"#64748b" }}>· {selected.size} selected</span>
                )}
              </div>

              {/* ITEM ROWS */}
              <div style={{ background:"#fff", borderRadius:"0 0 12px 12px" }}>
                {items.map(item => {
                  const p        = item.product;
                  const maxStock = item.variant?.stock ?? p?.stock ?? 99;
                  const imgSrc   = p?.main_image ?? (p as any)?.image_url ?? item.variant?.image_url ?? null;
                  const isRem    = removingId === item.id;
                  const isUpd    = updatingId === item.id;
                  const cprice   = p?.compare_price;
                  const savePct  = cprice && cprice > item.price ? Math.round((1 - item.price / cprice) * 100) : 0;
                  const lowStock = (item.variant?.stock ?? p?.stock ?? 99) <= 5;

                  return (
                    <div
                      key={item.id}
                      className={`kc-item${isRem ? " removing" : ""}`}
                      style={{ opacity: isUpd ? 0.6 : 1 }}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        className="kc-check"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        style={{ marginTop:48 }}
                      />

                      {/* Image */}
                      <Link href={`/store/product/${item.product_id}`} style={{ flexShrink:0 }}>
                        <div className="kc-img-box">
                          {imgSrc
                            ? <img src={imgSrc} alt={p?.title ?? ""} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                            : <div style={{ width:"100%", height:"100%", display:"grid", placeItems:"center", fontSize:36, color:"#c4bdb4" }}>📦</div>
                          }
                        </div>
                      </Link>

                      {/* CONTENT */}
                      <div style={{ flex:1, minWidth:0 }}>
                        {/* Title */}
                        <Link href={`/store/product/${item.product_id}`} style={{ textDecoration:"none" }}>
                          <div style={{ fontWeight:600, fontSize:14.5, color:"#0f172a", lineHeight:1.4, marginBottom:4,
                            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}
                            onMouseEnter={e => (e.currentTarget.style.color="#0033a0")}
                            onMouseLeave={e => (e.currentTarget.style.color="#0f172a")}
                          >
                            {p?.title ?? "Product"}
                          </div>
                        </Link>

                        {/* Meta */}
                        {item.variant && (
                          <div style={{ fontSize:12, color:"#64748b", marginBottom:5 }}>
                            Variant: <strong>{item.variant.title}</strong>
                          </div>
                        )}
                        {p?.brand && (
                          <div style={{ fontSize:12, color:"#64748b", marginBottom:5 }}>
                            Brand: <strong style={{ color:"#0033a0" }}>{p.brand}</strong>
                          </div>
                        )}

                        {/* Tags */}
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
                          {savePct > 0 && <span className="kc-tag-sale">-{savePct}% OFF</span>}
                          {lowStock && <span className="kc-tag-stock">⚡ Only {item.variant?.stock ?? p?.stock} left</span>}
                          <span className="kc-tag-free">✓ Free Delivery</span>
                        </div>

                        {/* PRICE ROW */}
                        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:12 }}>
                          <span style={{ fontWeight:800, fontSize:18, color:"#0f172a" }}>
                            {formatCurrency(item.price)}
                          </span>
                          {cprice && cprice > item.price && (
                            <>
                              <span style={{ fontSize:13, color:"#94a3b8", textDecoration:"line-through" }}>
                                {formatCurrency(cprice)}
                              </span>
                              <span style={{ fontSize:12, color:"#dc2626", fontWeight:700 }}>
                                Save {formatCurrency((cprice - item.price) * item.quantity)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* QTY STEPPER + SUBTOTAL */}
                        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.5, marginBottom:5 }}>Qty</div>
                            <div className={`kc-stepper${isUpd ? " kc-step-spin" : ""}`}>
                              <button
                                className="kc-step-btn"
                                onClick={() => updateQty(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || !!updatingId}
                              >−</button>
                              <span className="kc-step-num">{item.quantity}</span>
                              <button
                                className="kc-step-btn"
                                onClick={() => updateQty(item.id, item.quantity + 1)}
                                disabled={item.quantity >= maxStock || !!updatingId}
                              >+</button>
                            </div>
                          </div>

                          {item.quantity > 1 && (
                            <div style={{ fontSize:12, color:"#64748b", paddingTop:18 }}>
                              {item.quantity} × {formatCurrency(item.price)} =&nbsp;
                              <strong style={{ color:"#0f172a" }}>{formatCurrency(item.price * item.quantity)}</strong>
                            </div>
                          )}
                        </div>

                        {/* ACTION LINKS */}
                        <div className="kc-actions-row">
                          <button className="kc-act-btn" onClick={() => removeItem(item.id)} disabled={isRem}>
                            {isRem ? "Removing…" : "Delete"}
                          </button>
                          <span className="kc-act-divider" />
                          <button className="kc-act-btn" onClick={() => moveToWishlist(item)}>
                            Save for later
                          </button>
                          <span className="kc-act-divider" />
                          <Link href={`/store/product/${item.product_id}`} className="kc-act-btn">
                            See more like this
                          </Link>
                        </div>
                      </div>

                      {/* RIGHT: LINE PRICE */}
                      <div className="kc-line-price" style={{ flexShrink:0, textAlign:"right", minWidth:80, paddingTop:4 }}>
                        <div style={{ fontWeight:900, fontSize:17, color:"#0f172a" }}>
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                        {savePct > 0 && (
                          <div style={{ fontSize:11, color:"#dc2626", fontWeight:700, marginTop:2 }}>
                            -{savePct}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SUBTOTAL BOTTOM BAR */}
              <div style={{ marginTop:12, background:"#fff", borderRadius:12, padding:"14px 20px", border:"1px solid #e8e4de", display:"flex", justifyContent:"flex-end", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:14, color:"#64748b" }}>
                  Subtotal ({totalQty} item{totalQty !== 1 ? "s" : ""}):
                </span>
                <span style={{ fontWeight:900, fontSize:22, color:"#0f172a" }}>
                  {formatCurrency(subtotal)}
                </span>
                {savings > 0 && (
                  <span style={{ fontSize:12, color:"#dc2626", fontWeight:700 }}>
                    (You save {formatCurrency(savings)})
                  </span>
                )}
              </div>
            </div>

            {/* ═══ SUMMARY COLUMN ═══ */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              {/* FREE SHIPPING PROGRESS */}
              {toFree > 0 ? (
                <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8e4de", padding:"14px 16px" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", marginBottom:2 }}>
                    🚚 Add <span style={{ color:"#0033a0" }}>{formatCurrency(toFree)}</span> for FREE delivery
                  </div>
                  <div className="kc-prog-track">
                    <div className="kc-prog-fill" style={{ width:`${progress}%` }} />
                  </div>
                  <div style={{ fontSize:11, color:"#94a3b8" }}>{Math.round(progress)}% to free shipping</div>
                </div>
              ) : (
                <div style={{ background:"#f0fdf4", borderRadius:12, border:"1px solid #bbf7d0", padding:"12px 16px", fontSize:13, fontWeight:700, color:"#15803d" }}>
                  ✓ Your order qualifies for FREE delivery!
                </div>
              )}

              {/* ORDER SUMMARY CARD */}
              <div className="kc-summary">
                <div style={{ fontWeight:800, fontSize:16, color:"#0f172a", marginBottom:14, paddingBottom:12, borderBottom:"1px solid #f0ede8" }}>
                  Order Summary
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:14, fontSize:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:"#64748b" }}>Items ({totalQty})</span>
                    <span style={{ fontWeight:700 }}>{formatCurrency(subtotal + savings)}</span>
                  </div>
                  {savings > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:"#dc2626" }}>Discount</span>
                      <span style={{ fontWeight:700, color:"#dc2626" }}>−{formatCurrency(savings)}</span>
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:"#64748b" }}>Delivery</span>
                    <span style={{ fontWeight:700, color:toFree === 0 ? "#15803d" : "#64748b" }}>
                      {toFree === 0 ? "FREE" : "Calculated at checkout"}
                    </span>
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0 16px", borderTop:"2px solid #f0ede8", borderBottom:"1px solid #f0ede8", marginBottom:16 }}>
                  <span style={{ fontWeight:900, fontSize:16, color:"#0f172a" }}>Order Total:</span>
                  <span style={{ fontWeight:900, fontSize:24, color:"#0f172a", letterSpacing:-0.5 }}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {savings > 0 && (
                  <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:12, fontWeight:700, color:"#c2410c", textAlign:"center" }}>
                    🎉 You're saving {formatCurrency(savings)} on this order!
                  </div>
                )}

                <button className="kc-checkout" onClick={() => router.push("/store/checkout")}>
                  Proceed to Checkout ({totalQty} item{totalQty !== 1 ? "s" : ""})
                </button>

                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, justifyContent:"center" }}>
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="5" width="10" height="8" rx="2" stroke="#94a3b8" strokeWidth="1.5"/><path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="#94a3b8" strokeWidth="1.5"/></svg>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>Secure checkout · SSL encrypted</span>
                </div>

                <Link href="/store" style={{ display:"block", textAlign:"center", marginTop:12, fontSize:13, color:"#0033a0", fontWeight:600, textDecoration:"none" }}>
                  ← Continue Shopping
                </Link>

                {/* PAYMENT ICONS */}
                <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:14, paddingTop:14, borderTop:"1px solid #f0ede8" }}>
                  {["Visa", "MC", "EFT", "Cash"].map(m => (
                    <div key={m} style={{ padding:"4px 8px", background:"#f8f7f4", border:"1px solid #e8e4de", borderRadius:5, fontSize:10, fontWeight:800, color:"#64748b" }}>{m}</div>
                  ))}
                </div>

                {/* TRUST */}
                <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:7 }}>
                  {[
                    { icon:"✓", text:"30-day easy returns", color:"#15803d" },
                    { icon:"✓", text:"Genuine products guaranteed", color:"#15803d" },
                    { icon:"✓", text:"Customer support 7 days a week", color:"#15803d" },
                  ].map(t => (
                    <div key={t.text} style={{ display:"flex", gap:7, alignItems:"center", fontSize:12, color:"#64748b" }}>
                      <span style={{ color:t.color, fontWeight:900, fontSize:13 }}>{t.icon}</span>
                      {t.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}