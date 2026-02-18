"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cartApi } from "@/lib/api";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try { setCart(await cartApi.get()); }
    catch { setCart(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }

  async function updateQty(itemId: string, quantity: number) {
    try { await cartApi.updateItem(itemId, { quantity }); load(); }
    catch (e: any) { flash(e?.message ?? "Failed", false); }
  }

  async function remove(itemId: string) {
    try { await cartApi.removeItem(itemId); load(); flash("Item removed"); }
    catch (e: any) { flash(e?.message ?? "Failed", false); }
  }

  async function clear() {
    if (!confirm("Clear entire cart?")) return;
    try { await cartApi.clear(); load(); flash("Cart cleared"); }
    catch (e: any) { flash(e?.message ?? "Failed", false); }
  }

  const items = cart?.items ?? [];
  const total = items.reduce((sum: number, i: any) => sum + (Number(i.price ?? 0) * Number(i.quantity ?? 1)), 0);

  if (loading) return <div style={{ color: "#64748b" }}>Loading cart...</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>My Cart</h1>
        {items.length > 0 && <button onClick={clear} style={{ ...btn, color: "#dc2626", borderColor: "#fca5a5" }}>Clear Cart</button>}
      </div>

      {msg && <div style={{ ...banner, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b", marginBottom: 16 }}>{msg.text}</div>}

      {items.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛒</div>
          <div style={{ color: "#64748b", marginBottom: 20 }}>Your cart is empty.</div>
          <button onClick={() => router.push("/store")} style={greenBtn}>Shop Now</button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
            {items.map((item: any) => (
              <div key={item.id} style={{ ...card, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.product_title ?? item.title ?? "Product"}</div>
                  {item.variant_title && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{item.variant_title}</div>}
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0033a0" }}>R {Number(item.price ?? 0).toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => updateQty(item.id, Math.max(1, item.quantity - 1))} style={qtyBtn}>−</button>
                  <span style={{ minWidth: 28, textAlign: "center", fontWeight: 700 }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)} style={qtyBtn}>+</button>
                </div>
                <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18 }}>×</button>
              </div>
            ))}
          </div>

          <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Total ({items.length} item{items.length !== 1 ? "s" : ""})</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0033a0" }}>R {total.toLocaleString()}</div>
            </div>
            <button onClick={() => router.push("/checkout")} style={greenBtn}>Proceed to Checkout →</button>
          </div>
        </>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 };
const btn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13 };
const greenBtn: React.CSSProperties = { padding: "10px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0033a0,#009543)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const qtyBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" };
const banner: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid", fontSize: 14 };