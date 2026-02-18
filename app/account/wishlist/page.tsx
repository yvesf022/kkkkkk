"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { wishlistApi } from "@/lib/api";

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try { const data = await wishlistApi.get() as any; setItems(data?.items ?? data ?? []); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }

  async function remove(productId: string) {
    try { await wishlistApi.remove(productId); load(); flash("Removed from wishlist"); }
    catch (e: any) { flash(e?.message ?? "Failed", false); }
  }

  async function moveToCart(productId: string) {
    try { await wishlistApi.moveToCart(productId); load(); flash("Moved to cart!"); }
    catch (e: any) { flash(e?.message ?? "Failed", false); }
  }

  if (loading) return <div style={{ color: "#64748b" }}>Loading wishlist...</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>My Wishlist</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>Products you saved for later.</p>

      {msg && <div style={{ ...banner, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b", marginBottom: 16 }}>{msg.text}</div>}

      {items.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>❤️</div>
          <div style={{ color: "#64748b", marginBottom: 20 }}>Your wishlist is empty.</div>
          <button onClick={() => router.push("/store")} style={greenBtn}>Discover Products</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item: any) => (
            <div key={item.product_id ?? item.id} style={{ ...card, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {item.main_image && (
                <img src={item.main_image} alt={item.title} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.title ?? "Product"}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0033a0" }}>R {Number(item.price ?? 0).toLocaleString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => moveToCart(item.product_id ?? item.id)} style={greenBtn}>Move to Cart</button>
                <button onClick={() => router.push(`/store/product/${item.product_id ?? item.id}`)} style={btn}>View</button>
                <button onClick={() => remove(item.product_id ?? item.id)} style={{ ...btn, color: "#dc2626", borderColor: "#fca5a5" }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13 };
const greenBtn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0033a0,#009543)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 };
const banner: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid", fontSize: 14 };