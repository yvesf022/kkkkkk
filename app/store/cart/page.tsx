"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cartApi, wishlistApi } from "@/lib/api";
import type { Cart, CartItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  async function loadCart() {
    try {
      const data = await cartApi.get() as Cart;
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(itemId: string) {
    setUpdatingId(itemId);
    try {
      await cartApi.removeItem(itemId);
      setCart((prev) => prev ? ({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
        subtotal: prev.items.filter((i) => i.id !== itemId).reduce((s, i) => s + i.quantity * i.price, 0),
      }) : prev);
      toast.success("Item removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    } finally {
      setUpdatingId(null);
    }
  }

  async function clearCart() {
    if (!confirm("Clear all items from your cart?")) return;
    setClearing(true);
    try {
      await cartApi.clear();
      setCart((prev) => prev ? ({ ...prev, items: [], subtotal: 0 }) : prev);
      toast.success("Cart cleared");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to clear cart");
    } finally {
      setClearing(false);
    }
  }

  async function moveToWishlist(item: CartItem) {
    if (!item.product_id) return;
    try {
      await wishlistApi.add(item.product_id);
      await cartApi.removeItem(item.id);
      setCart((prev) => prev ? ({ ...prev, items: prev.items.filter((i) => i.id !== item.id), subtotal: prev.items.filter((i) => i.id !== item.id).reduce((s, i) => s + i.quantity * i.price, 0) }) : prev);
      toast.success("Moved to wishlist!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
      Loading cart...
    </div>
  );

  const items = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isEmpty = items.length === 0;

  if (isEmpty) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>🛒</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Your cart is empty</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Start shopping and add items to your cart.</p>
        <Link href="/store" style={{ padding: "12px 28px", borderRadius: 12, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "40px 0 80px" }}>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Shopping Cart</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#64748b" }}>{items.length} item{items.length > 1 ? "s" : ""}</span>
            <button onClick={clearCart} disabled={clearing} style={{ fontSize: 13, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              {clearing ? "Clearing..." : "Clear Cart"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>

          {/* ITEMS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => {
              const product = item.product;
              const maxStock = item.variant?.stock ?? product?.stock ?? 99;

              return (
                <div
                  key={item.id}
                  style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, display: "flex", gap: 16, alignItems: "flex-start", opacity: updatingId === item.id ? 0.6 : 1, transition: "opacity 0.2s" }}
                >
                  {/* Image */}
                  <Link href={`/store/product/${item.product_id}`} style={{ flexShrink: 0 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 12, background: "#f1f5f9", overflow: "hidden" }}>
                      {product?.main_image ? (
                        <img src={product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📦</div>}
                    </div>
                  </Link>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/store/product/${item.product_id}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {product?.title ?? "Product"}
                      </div>
                    </Link>
                    {item.variant && (
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{item.variant.title}</div>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", marginBottom: 12 }}>
                      {formatCurrency(item.price)}
                      {product?.compare_price && product.compare_price > item.price && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8", textDecoration: "line-through", fontWeight: 400 }}>
                          {formatCurrency(product.compare_price)}
                        </span>
                      )}
                    </div>

                    {/* Qty + actions row */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {/* Qty */}
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1 || !!updatingId} style={qtyBtn}>−</button>
                        <span style={{ minWidth: 36, textAlign: "center", fontWeight: 800, fontSize: 14 }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={item.quantity >= maxStock || !!updatingId} style={qtyBtn}>+</button>
                      </div>

                      <button onClick={() => moveToWishlist(item)} style={tinyBtn}>♡ Wishlist</button>
                      <button onClick={() => removeItem(item.id)} disabled={!!updatingId} style={{ ...tinyBtn, color: "#dc2626", borderColor: "#fca5a5" }}>Remove</button>
                    </div>
                  </div>

                  {/* Line total */}
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                    {item.quantity > 1 && (
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.quantity} × {formatCurrency(item.price)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUMMARY */}
          <div style={{ position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 20 }}>Order Summary</div>

              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#64748b" }}>Subtotal ({items.length} items)</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#64748b" }}>Shipping</span>
                  <span style={{ fontWeight: 700, color: "#166534" }}>Free</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 24, color: "#0f172a" }}>{formatCurrency(subtotal)}</span>
              </div>

              <button
                onClick={() => router.push("/store/checkout")}
                style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: "#0f172a", color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer" }}
              >
                Proceed to Checkout →
              </button>

              <Link href="/store" style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 13, color: "#64748b", textDecoration: "none" }}>
                ← Continue Shopping
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 16, display: "grid", gap: 10 }}>
              {[
                { icon: "🔒", text: "Secure checkout" },
                { icon: "🚚", text: "Free delivery on all orders" },
                { icon: "↩️", text: "Easy returns within 30 days" },
              ].map((b) => (
                <div key={b.text} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "#475569" }}>
                  <span>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const qtyBtn: React.CSSProperties = { padding: "7px 12px", background: "none", border: "none", fontWeight: 900, fontSize: 18, cursor: "pointer", color: "#0f172a" };
const tinyBtn: React.CSSProperties = { background: "none", border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#475569" };