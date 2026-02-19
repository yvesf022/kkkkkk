"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import { wishlistApi } from "@/lib/api";
import type { WishlistItem } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await wishlistApi.get() as any;
      setItems(data?.items ?? data ?? []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function moveToCart(item: WishlistItem) {
    setMovingId(item.product_id);
    try {
      await wishlistApi.moveToCart(item.product_id);
      setItems((prev) => prev.filter((i) => i.product_id !== item.product_id));
      toast.success("Moved to cart!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to move to cart");
    } finally {
      setMovingId(null);
    }
  }

  async function removeFromWishlist(productId: string) {
    setRemovingId(productId);
    try {
      await wishlistApi.remove(productId);
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
      toast.success("Removed from wishlist");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <div style={{ color: "#64748b" }}>Loading wishlist...</div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>My Wishlist</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          {items.length > 0 ? `${items.length} saved item${items.length > 1 ? "s" : ""}` : "Items you've saved for later"}
        </p>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>♡</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Your wishlist is empty</div>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>Save items you like by clicking the heart icon on any product.</p>
          <Link href="/store" style={{ padding: "10px 22px", borderRadius: 10, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {items.map((item) => {
            const product = item.product;
            const inStock = product?.in_stock ?? product?.stock > 0;
            const discount = product?.compare_price && product.compare_price > (product?.price ?? 0)
              ? Math.round(((product.compare_price - (product?.price ?? 0)) / product.compare_price) * 100)
              : null;

            return (
              <div
                key={item.id}
                style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", display: "flex", flexDirection: "column" }}
              >
                {/* Image */}
                <Link href={`/store/product/${item.product_id}`} style={{ display: "block", position: "relative" }}>
                  <div style={{ height: 180, background: "#f1f5f9", overflow: "hidden", position: "relative" }}>
                    {product?.main_image ? (
                      <img src={product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>📦</div>
                    )}
                    {discount && (
                      <div style={{ position: "absolute", top: 10, left: 10, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 99 }}>
                        -{discount}%
                      </div>
                    )}
                    {!inStock && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontWeight: 700, color: "#991b1b", fontSize: 13 }}>Out of Stock</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Link href={`/store/product/${item.product_id}`} style={{ textDecoration: "none" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {product?.title ?? "Product"}
                    </div>
                  </Link>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{formatCurrency(product?.price ?? 0)}</span>
                    {product?.compare_price && product.compare_price > (product?.price ?? 0) && (
                      <span style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }}>{formatCurrency(product.compare_price)}</span>
                    )}
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => moveToCart(item)}
                      disabled={!inStock || movingId === item.product_id}
                      style={{ padding: "9px", borderRadius: 10, border: "none", background: inStock ? "#0f172a" : "#e5e7eb", color: inStock ? "#fff" : "#94a3b8", fontWeight: 700, fontSize: 13, cursor: inStock ? "pointer" : "not-allowed", opacity: movingId === item.product_id ? 0.7 : 1 }}
                    >
                      {movingId === item.product_id ? "Moving..." : inStock ? "Move to Cart" : "Out of Stock"}
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.product_id)}
                      disabled={removingId === item.product_id}
                      style={{ padding: "7px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", color: "#dc2626", fontWeight: 600, fontSize: 12, cursor: "pointer", opacity: removingId === item.product_id ? 0.6 : 1 }}
                    >
                      {removingId === item.product_id ? "Removing..." : "♡ Remove"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}