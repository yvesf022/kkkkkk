"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cartApi, wishlistApi, productsApi } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { Cart, CartItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

/* ─────────────────────────────────────────────────────────────
   INJECTED STYLES
───────────────────────────────────────────────────────────── */
const css = `
  .kc-item {
    background: #fff;
    border-radius: 20px;
    border: 1.5px solid #f0ede8;
    padding: 20px;
    display: flex;
    gap: 18px;
    align-items: flex-start;
    transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
    position: relative;
  }
  .kc-item:hover {
    box-shadow: 0 8px 32px rgba(0,51,160,0.08);
    border-color: #d0d8f0;
    transform: translateY(-1px);
  }
  .kc-item.updating { opacity: 0.5; pointer-events: none; }
  .kc-item.removing {
    animation: kcSlideOut 0.3s ease forwards;
    pointer-events: none;
  }
  @keyframes kcSlideOut {
    to { opacity: 0; transform: translateX(30px); max-height: 0; padding: 0; margin: 0; overflow: hidden; }
  }
  .kc-item.entering {
    animation: kcSlideIn 0.35s cubic-bezier(0.34,1.4,0.64,1) forwards;
  }
  @keyframes kcSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .kc-img {
    width: 96px; height: 96px;
    border-radius: 14px;
    overflow: hidden;
    flex-shrink: 0;
    background: #f4f2ee;
    border: 1px solid #ede9e3;
    position: relative;
  }
  .kc-img img {
    width: 100%; height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }
  .kc-item:hover .kc-img img { transform: scale(1.07); }

  .kc-qty-wrap {
    display: flex;
    align-items: center;
    background: #f8f7f5;
    border: 1.5px solid #ede9e3;
    border-radius: 12px;
    overflow: hidden;
    gap: 0;
  }
  .kc-qty-btn {
    width: 36px; height: 36px;
    background: none;
    border: none;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.15s, color 0.15s;
    line-height: 1;
  }
  .kc-qty-btn:hover:not(:disabled) {
    background: #0033a0;
    color: #fff;
  }
  .kc-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .kc-qty-num {
    min-width: 38px;
    text-align: center;
    font-weight: 800;
    font-size: 15px;
    color: #0f172a;
    border-left: 1.5px solid #ede9e3;
    border-right: 1.5px solid #ede9e3;
    height: 36px;
    display: grid;
    place-items: center;
  }

  .kc-pill-btn {
    padding: 6px 14px;
    border-radius: 99px;
    border: 1.5px solid #e8e4df;
    background: #fff;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .kc-pill-btn:hover {
    border-color: #0033a0;
    color: #0033a0;
    background: #eef2ff;
  }
  .kc-pill-btn.danger:hover {
    border-color: #fca5a5;
    color: #dc2626;
    background: #fff1f2;
  }

  .kc-checkout-btn {
    width: 100%;
    padding: 17px;
    border-radius: 16px;
    border: none;
    background: linear-gradient(135deg, #0033a0 0%, #0047d4 100%);
    color: #fff;
    font-weight: 900;
    font-size: 16px;
    cursor: pointer;
    letter-spacing: 0.3px;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(0,51,160,0.25);
    position: relative;
    overflow: hidden;
  }
  .kc-checkout-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .kc-checkout-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 32px rgba(0,51,160,0.4);
  }
  .kc-checkout-btn:hover::after { opacity: 1; }
  .kc-checkout-btn:active { transform: translateY(0); }

  .kc-summary {
    background: #fff;
    border-radius: 24px;
    border: 1.5px solid #f0ede8;
    padding: 28px;
    position: sticky;
    top: 90px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.05);
  }

  .kc-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 99px;
    background: linear-gradient(135deg, #0033a0, #009543);
    color: #fff;
    font-size: 11px;
    font-weight: 900;
    transition: transform 0.2s;
  }
  .kc-badge.bump {
    animation: kcBump 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes kcBump {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.7); }
    100% { transform: scale(1); }
  }

  .kc-header-cart {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    border-radius: 999px;
    background: rgba(0,0,0,0.65);
    border: 1px solid rgba(255,255,255,0.15);
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    text-decoration: none;
    white-space: nowrap;
  }
  .kc-header-cart:hover { background: rgba(0,51,160,0.85); }

  .kc-added-flash {
    position: fixed;
    top: 80px;
    right: 24px;
    z-index: 9999;
    background: #fff;
    border: 1.5px solid #d0d8f0;
    border-radius: 16px;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 12px 40px rgba(0,51,160,0.15);
    animation: kcFlashIn 0.35s cubic-bezier(0.34,1.4,0.64,1) forwards;
    min-width: 260px;
    max-width: 340px;
  }
  @keyframes kcFlashIn {
    from { opacity: 0; transform: translateX(40px) scale(0.95); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }
  .kc-added-flash.out {
    animation: kcFlashOut 0.25s ease forwards;
  }
  @keyframes kcFlashOut {
    to { opacity: 0; transform: translateX(40px) scale(0.95); }
  }

  .kc-progress-bar {
    height: 4px;
    border-radius: 99px;
    background: #f0ede8;
    overflow: hidden;
    margin: 12px 0 6px;
  }
  .kc-progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, #009543, #00c055);
    transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
  }

  .kc-skeleton {
    background: linear-gradient(90deg, #f4f2ee 25%, #ede9e3 50%, #f4f2ee 75%);
    background-size: 200% 100%;
    animation: kcShimmer 1.4s infinite;
    border-radius: 10px;
  }
  @keyframes kcShimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .kc-discount-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #fef9ec;
    border: 1px solid #fde68a;
    color: #b45309;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
  }

  .kc-stock-warn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    color: #c2410c;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
  }

  @media (max-width: 900px) {
    .kc-grid { grid-template-columns: 1fr !important; }
    .kc-summary { position: static !important; }
    .kc-img { width: 76px !important; height: 76px !important; }
  }

  @media (max-width: 560px) {
    .kc-item { padding: 14px !important; gap: 12px !important; }
    .kc-img { width: 64px !important; height: 64px !important; }
    .kc-actions { flex-wrap: wrap; }
    .kc-line-total { display: none !important; }
    .kc-price-mobile { display: block !important; }
  }
`;

/* ─────────────────────────────────────────────────────────────
   HEADER CART BADGE — exported so Header.tsx can import it
   This syncs with the Zustand cart store automatically.
───────────────────────────────────────────────────────────── */
export function CartHeaderButton({ onClick }: { onClick?: () => void }) {
  const itemCount = useCart((s) => s.itemCount);
  const prevCount = useRef(itemCount);
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBumping(true);
      setTimeout(() => setBumping(false), 400);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  return (
    <button onClick={onClick} className="kc-header-cart" style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontFamily: "inherit" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      Cart
      {itemCount > 0 && (
        <span className={`kc-badge${bumping ? " bump" : ""}`}>
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   CART ADDED NOTIFICATION (global, mount in layout or use toast)
───────────────────────────────────────────────────────────── */
export function CartAddedFlash({ product, visible, onDone }: {
  product?: { title: string; image?: string | null; price: number } | null;
  visible: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDone, 260);
    }, 3200);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible || !product) return null;

  return (
    <div className={`kc-added-flash${leaving ? " out" : ""}`}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f4f2ee", overflow: "hidden", flexShrink: 0, border: "1px solid #ede9e3" }}>
        {product.image
          ? <img src={product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 20 }}>📦</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#009543", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>✓ Added to cart</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.title}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{formatCurrency(product.price)}</div>
      </div>
      <button
        onClick={() => router.push("/store/cart")}
        style={{ padding: "7px 12px", borderRadius: 10, border: "none", background: "#0033a0", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
      >
        View
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN CART PAGE
───────────────────────────────────────────────────────────── */
export default function CartPage() {
  const router = useRouter();
  const zustandCart = useCart((s) => s.cart);
  const fetchZustand = useCart((s) => s.fetchCart);

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  async function loadCart() {
    try {
      const data = await cartApi.get() as Cart;
      const items = data?.items ?? [];
      const needsEnrichment = items.filter((i) => !i.product && i.product_id);
      if (needsEnrichment.length > 0) {
        const enriched = await Promise.allSettled(
          needsEnrichment.map((i) => productsApi.get(i.product_id))
        );
        const productMap: Record<string, any> = {};
        needsEnrichment.forEach((item, idx) => {
          const r = enriched[idx];
          if (r.status === "fulfilled") productMap[item.product_id] = r.value;
        });
        data.items = items.map((i) =>
          !i.product && productMap[i.product_id]
            ? { ...i, product: productMap[i.product_id] }
            : i
        );
      }
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQty(itemId: string, qty: number) {
    if (qty < 1) return;
    setUpdatingId(itemId);
    try {
      await cartApi.updateItem(itemId, { quantity: qty });
      setCart((prev) => prev ? ({
        ...prev,
        items: prev.items.map((i) => i.id === itemId ? { ...i, quantity: qty } : i),
        subtotal: prev.items.reduce((s, i) => s + (i.id === itemId ? qty : i.quantity) * i.price, 0),
      }) : prev);
      await fetchZustand(); // sync header badge
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(itemId: string) {
    setRemovingId(itemId);
    // let animation play
    await new Promise((r) => setTimeout(r, 280));
    try {
      await cartApi.removeItem(itemId);
      setCart((prev) => prev ? ({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
        subtotal: prev.items.filter((i) => i.id !== itemId).reduce((s, i) => s + i.quantity * i.price, 0),
      }) : prev);
      await fetchZustand();
      toast.success("Item removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
      setRemovingId(null);
      loadCart();
    } finally {
      setRemovingId(null);
    }
  }

  async function clearCart() {
    if (!confirm("Clear all items from your cart?")) return;
    setClearing(true);
    try {
      await cartApi.clear();
      setCart((prev) => prev ? ({ ...prev, items: [], subtotal: 0 }) : prev);
      await fetchZustand();
      toast.success("Cart cleared");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to clear cart");
    } finally {
      setClearing(false);
    }
  }

  async function moveToWishlist(item: CartItem) {
    if (!item.product_id) return;
    setRemovingId(item.id);
    await new Promise((r) => setTimeout(r, 280));
    try {
      await wishlistApi.add(item.product_id);
      await cartApi.removeItem(item.id);
      setCart((prev) => prev ? ({
        ...prev,
        items: prev.items.filter((i) => i.id !== item.id),
        subtotal: prev.items.filter((i) => i.id !== item.id).reduce((s, i) => s + i.quantity * i.price, 0),
      }) : prev);
      await fetchZustand();
      toast.success("Moved to wishlist!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
      setRemovingId(null);
    } finally {
      setRemovingId(null);
    }
  }

  /* ── Loading skeleton ── */
  if (loading) return (
    <>
      <style>{css}</style>
      <div style={{ background: "#f8f7f5", minHeight: "100vh", padding: "40px 16px 80px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="kc-skeleton" style={{ height: 36, width: 220, marginBottom: 32 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }} className="kc-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((k) => (
                <div key={k} style={{ background: "#fff", borderRadius: 20, padding: 20, display: "flex", gap: 18, border: "1.5px solid #f0ede8" }}>
                  <div className="kc-skeleton" style={{ width: 96, height: 96, borderRadius: 14, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="kc-skeleton" style={{ height: 18, width: "60%" }} />
                    <div className="kc-skeleton" style={{ height: 14, width: "30%" }} />
                    <div className="kc-skeleton" style={{ height: 14, width: "20%" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="kc-skeleton" style={{ height: 300, borderRadius: 24 }} />
          </div>
        </div>
      </div>
    </>
  );

  const items = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const isEmpty = items.length === 0;

  // Free shipping progress (e.g. free over M100)
  const FREE_THRESHOLD = 100;
  const progressPct = Math.min((subtotal / FREE_THRESHOLD) * 100, 100);
  const remaining = Math.max(FREE_THRESHOLD - subtotal, 0);

  /* ── Empty state ── */
  if (isEmpty) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "75vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 32, textAlign: "center", background: "#f8f7f5" }}>
        <div style={{ width: 100, height: 100, borderRadius: 999, background: "#fff", border: "2px solid #f0ede8", display: "grid", placeItems: "center", fontSize: 44, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
          🛒
        </div>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px", color: "#0f172a" }}>Your cart is empty</h2>
          <p style={{ color: "#64748b", margin: 0, fontSize: 15 }}>Looks like you haven't added anything yet.</p>
        </div>
        <Link href="/store" style={{ padding: "14px 32px", borderRadius: 14, background: "linear-gradient(135deg,#0033a0,#0047d4)", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15, boxShadow: "0 4px 20px rgba(0,51,160,0.25)", transition: "all 0.2s" }}>
          Start Shopping →
        </Link>
        <Link href="/store" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>Browse all products</Link>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div style={{ background: "#f8f7f5", minHeight: "100vh", padding: "36px 16px 80px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* ── PAGE HEADER ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 4px", color: "#0f172a", letterSpacing: -0.5 }}>
                Shopping Cart
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                {totalItems} item{totalItems !== 1 ? "s" : ""} · {formatCurrency(subtotal)} total
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/store" style={{ fontSize: 13, color: "#0033a0", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                ← Continue Shopping
              </Link>
              <span style={{ color: "#e2e0db" }}>|</span>
              <button
                onClick={clearCart}
                disabled={clearing}
                style={{ fontSize: 13, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0, opacity: clearing ? 0.6 : 1 }}
              >
                {clearing ? "Clearing…" : "Clear Cart"}
              </button>
            </div>
          </div>

          {/* ── MAIN GRID ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }} className="kc-grid">

            {/* ═══ LEFT: ITEMS ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((item, idx) => {
                const product = item.product;
                const maxStock = item.variant?.stock ?? product?.stock ?? 99;
                const imgSrc = product?.main_image ?? (product as any)?.image_url ?? item.variant?.image_url ?? null;
                const isRemoving = removingId === item.id;
                const isUpdating = updatingId === item.id;
                const discountPct = product?.compare_price && product.compare_price > item.price
                  ? Math.round((1 - item.price / product.compare_price) * 100)
                  : null;
                const lowStock = (item.variant?.stock ?? product?.stock ?? 99) <= 5;

                return (
                  <div
                    key={item.id}
                    className={`kc-item entering${isRemoving ? " removing" : ""}${isUpdating ? " updating" : ""}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Image */}
                    <Link href={`/store/product/${item.product_id}`} style={{ flexShrink: 0 }}>
                      <div className="kc-img">
                        {imgSrc
                          ? <img src={imgSrc} alt={product?.title ?? ""} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 32 }}>📦</div>
                        }
                        {discountPct && (
                          <div style={{ position: "absolute", top: 6, left: 6, background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 6 }}>
                            -{discountPct}%
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/store/product/${item.product_id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#0033a0")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#0f172a")}
                        >
                          {product?.title ?? "Product"}
                        </div>
                      </Link>

                      {item.variant && (
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0033a0", display: "inline-block" }} />
                          {item.variant.title}
                        </div>
                      )}

                      {/* Tags row */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                        {discountPct && (
                          <span className="kc-discount-tag">🏷 Save {discountPct}%</span>
                        )}
                        {lowStock && (
                          <span className="kc-stock-warn">⚡ Only {item.variant?.stock ?? product?.stock} left</span>
                        )}
                      </div>

                      {/* Price */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
                          {formatCurrency(item.price)}
                        </span>
                        {product?.compare_price && product.compare_price > item.price && (
                          <span style={{ fontSize: 13, color: "#94a3b8", textDecoration: "line-through", fontWeight: 400 }}>
                            {formatCurrency(product.compare_price)}
                          </span>
                        )}
                        {/* Mobile subtotal */}
                        {item.quantity > 1 && (
                          <span style={{ fontSize: 12, color: "#94a3b8" }} className="kc-price-mobile">
                            × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                          </span>
                        )}
                      </div>

                      {/* Actions row */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} className="kc-actions">
                        {/* Qty stepper */}
                        <div className="kc-qty-wrap">
                          <button
                            className="kc-qty-btn"
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || !!updatingId}
                            title="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="kc-qty-num">{item.quantity}</span>
                          <button
                            className="kc-qty-btn"
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            disabled={item.quantity >= maxStock || !!updatingId}
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button onClick={() => moveToWishlist(item)} className="kc-pill-btn">
                          ♡ Wishlist
                        </button>
                        <button onClick={() => removeItem(item.id)} className="kc-pill-btn danger" disabled={isRemoving}>
                          {isRemoving ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>

                    {/* Line total — hidden on mobile */}
                    <div style={{ flexShrink: 0, textAlign: "right", minWidth: 80 }} className="kc-line-total">
                      <div style={{ fontWeight: 900, fontSize: 17, color: "#0f172a" }}>
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                      {item.quantity > 1 && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                          {item.quantity} × {formatCurrency(item.price)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══ RIGHT: SUMMARY ═══ */}
            <div className="kc-summary">
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20, color: "#0f172a", letterSpacing: -0.3 }}>
                Order Summary
              </div>

              {/* Free shipping progress */}
              {remaining > 0 ? (
                <div style={{ background: "#f0f7ff", border: "1px solid #d0e4ff", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0033a0", marginBottom: 6 }}>
                    🚚 Add {formatCurrency(remaining)} more for FREE shipping!
                  </div>
                  <div className="kc-progress-bar">
                    <div className="kc-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{Math.round(progressPct)}% of the way there</div>
                </div>
              ) : (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", marginBottom: 20, fontSize: 13, fontWeight: 700, color: "#166534" }}>
                  ✓ You qualify for FREE shipping!
                </div>
              )}

              {/* Price rows */}
              <div style={{ marginBottom: 4 }}>
                <div className="price-row" style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f4f2ee", fontSize: 14 }}>
                  <span style={{ color: "#64748b" }}>Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f4f2ee", fontSize: 14 }}>
                  <span style={{ color: "#64748b" }}>Shipping</span>
                  <span style={{ fontWeight: 700, color: remaining > 0 ? "#64748b" : "#166534" }}>
                    {remaining > 0 ? "Calculated at checkout" : "Free"}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 20px", borderTop: "2px solid #f0ede8", marginTop: 4 }}>
                <span style={{ fontWeight: 900, fontSize: 17, color: "#0f172a" }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 26, color: "#0f172a", letterSpacing: -1 }}>
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* Checkout */}
              <button className="kc-checkout-btn" onClick={() => router.push("/store/checkout")}>
                Proceed to Checkout →
              </button>

              {/* Secondary */}
              <Link href="/store" style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
                ← Continue Shopping
              </Link>

              {/* Trust badges */}
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #f4f2ee", display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  { icon: "🔒", text: "SSL secure checkout" },
                  { icon: "🚚", text: "Free delivery on orders over M100" },
                  { icon: "↩️", text: "Easy 30-day returns" },
                  { icon: "💳", text: "Multiple payment methods" },
                ].map((b) => (
                  <div key={b.text} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "#64748b" }}>
                    <span style={{ fontSize: 14 }}>{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}