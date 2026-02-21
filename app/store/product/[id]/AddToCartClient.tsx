"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import type { Product, ProductVariant } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { useRouter } from "next/navigation";

interface Props { product: Product; }

function resolveImages(product: Product): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  function add(url: string | null | undefined) {
    if (url && typeof url === "string" && !seen.has(url)) { seen.add(url); urls.push(url); }
  }
  add(product.main_image);
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = (product.images as any[])[0];
    if (typeof first === "string") {
      (product.images as unknown as string[]).forEach(add);
    } else {
      const sorted = [...(product.images as any[])].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.position ?? 0) - (b.position ?? 0);
      });
      sorted.forEach(img => add(img.image_url ?? img.url ?? img));
    }
  }
  return urls;
}

function SafeImage({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, background: "#f1f5f9", ...style }}>
        📦
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} />;
}

export default function AddToCartClient({ product }: Props) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const cartLoading = useCart((s) => s.loading);

  // ── Auth: read state + trigger hydration if not already done ──────────────
  // This component can render outside of RequireAuth (public product pages),
  // so it must own hydration itself. Without this, user is permanently null
  // for authenticated visitors because no parent ever calls hydrate().
  const { user, loading: authLoading } = useAuth();
  const hydrate = useAuth((s) => s.hydrate);
  const hydratedOnce = useRef(false);
  useEffect(() => {
    if (!hydratedOnce.current) {
      hydratedOnce.current = true;
      hydrate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allImages = resolveImages(product);
  const [activeIdx, setActiveIdx] = useState(0);

  const activeVariants = product.variants?.filter((v) => !v.is_deleted && v.is_active) ?? [];
  const attrKeys = Array.from(new Set(activeVariants.flatMap((v) => Object.keys(v.attributes))));

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(() => {
    if (activeVariants.length === 0) return {};
    const defaultV = activeVariants.find((v) => v.in_stock) ?? activeVariants[0];
    return { ...defaultV.attributes };
  });

  const resolvedVariant: ProductVariant | null =
    activeVariants.find((v) => attrKeys.every((k) => v.attributes[k] === selectedAttrs[k])) ?? null;

  const variantImageUrl = resolvedVariant?.image_url ?? null;
  const displayImages =
    variantImageUrl && !allImages.includes(variantImageUrl)
      ? [variantImageUrl, ...allImages]
      : allImages;

  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const inStock = resolvedVariant
    ? resolvedVariant.in_stock && resolvedVariant.stock > 0
    : product.in_stock && product.stock > 0;
  const maxStock = resolvedVariant?.stock ?? product.stock;

  const displayPrice = resolvedVariant?.price ?? product.price;
  const displayCompare = resolvedVariant?.compare_price ?? product.compare_price;
  const discountPct =
    displayCompare && displayCompare > displayPrice
      ? Math.round(((displayCompare - displayPrice) / displayCompare) * 100)
      : null;

  function selectAttr(key: string, value: string) {
    setSelectedAttrs((prev) => ({ ...prev, [key]: value }));
    setQty(1);
    setJustAdded(false);
  }

  function isOptionAvailable(key: string, value: string) {
    return activeVariants.some(
      (v) =>
        v.attributes[key] === value &&
        attrKeys.filter((k) => k !== key).every((k) => !selectedAttrs[k] || v.attributes[k] === selectedAttrs[k]) &&
        v.in_stock && v.stock > 0
    );
  }

  // Return URL so user lands back on this product after login
  const returnUrl = `/store/product/${product.id}`;

  async function handleAdd() {
    // Still hydrating — button shouldn't be reachable, but guard anyway
    if (authLoading) return;
    // FIX #4: Redirect to login if not authenticated — Amazon-style
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    if (!inStock) { toast.error("Out of stock"); return; }
    if (qty < 1 || qty > maxStock) { toast.error("Invalid quantity"); return; }
    if (activeVariants.length > 0 && !resolvedVariant) {
      toast.error("Please select a valid variant combination");
      return;
    }
    setAdding(true);
    try {
      await addItem(product.id, qty, resolvedVariant?.id);
      toast.success(`${product.title} added to cart!`);
      setJustAdded(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add to cart. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}
      className="product-detail-grid"
    >
      {/* ═══════════════ IMAGE GALLERY ═══════════════ */}
      <div>
        <style>{`
          .pd-gallery { display:flex; flex-direction:column; gap:10px; }
          .pd-thumbs { display:flex; flex-direction:row; gap:8px; overflow-x:auto; scrollbar-width:thin; padding-bottom:4px; }
          .pd-thumb { width:72px; height:72px; border-radius:8px; overflow:hidden; border:2px solid #e8e4de; background:#f8f7f4; cursor:pointer; padding:0; flex-shrink:0; outline:none; transition:border-color 0.15s, box-shadow 0.15s; display:block; }
          .pd-thumb.active { border-color:#0033a0; box-shadow:0 0 0 3px rgba(0,51,160,0.12); }
          .pd-thumb:not(.active):hover { border-color:#94a3b8; }
          .pd-thumb img,.pd-thumb-inner { width:100%; height:100%; object-fit:cover; display:block; }
          .pd-main-wrap { width:100%; border-radius:16px; overflow:hidden; border:1px solid #e8e4de; background:#f8f7f4; aspect-ratio:1/1; position:relative; }
          .pd-main-wrap img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.4s ease; }
          .pd-main-wrap:hover img { transform:scale(1.03); }
          .pd-nav { position:absolute; top:50%; transform:translateY(-50%); width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.95); border:1px solid #e8e4de; cursor:pointer; display:grid; place-items:center; font-size:20px; font-weight:900; color:#0f172a; outline:none; transition:all 0.15s; box-shadow:0 2px 10px rgba(0,0,0,0.12); z-index:2; }
          .pd-nav:hover { background:#0033a0; color:#fff; border-color:#0033a0; }
          .pd-nav.prev { left:10px; }
          .pd-nav.next { right:10px; }
          .pd-counter { position:absolute; bottom:12px; right:12px; background:rgba(0,0,0,0.55); color:#fff; border-radius:99px; padding:3px 11px; font-size:12px; font-weight:700; backdrop-filter:blur(4px); }
          .pd-dots { display:none; justify-content:center; gap:6px; margin-top:10px; }
          @media(max-width:640px) {
            .pd-thumbs { display:flex; }
            .pd-dots { display:none; }
          }
        `}</style>

        <div className="pd-gallery">
          <div className="pd-main-wrap">
            {displayImages.length > 0
              ? <SafeImage src={displayImages[activeIdx] ?? displayImages[0]} alt={product.title} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72 }}>📦</div>
            }
            {discountPct && (
              <div style={{ position: "absolute", top: 14, left: 14, background: "#dc2626", color: "#fff", borderRadius: 8, padding: "4px 10px", fontWeight: 800, fontSize: 13, zIndex: 2 }}>
                -{discountPct}%
              </div>
            )}
            {displayImages.length > 1 && (
              <>
                <button type="button" className="pd-nav prev"
                  onClick={() => setActiveIdx(i => (i - 1 + displayImages.length) % displayImages.length)}>‹</button>
                <button type="button" className="pd-nav next"
                  onClick={() => setActiveIdx(i => (i + 1) % displayImages.length)}>›</button>
                <div className="pd-counter">{activeIdx + 1} / {displayImages.length}</div>
              </>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="pd-thumbs">
              {displayImages.map((url, i) => (
                <button key={i} type="button"
                  className={`pd-thumb${activeIdx === i ? " active" : ""}`}
                  onClick={() => setActiveIdx(i)} title={`View image ${i + 1}`}>
                  <SafeImage src={url} alt={`${product.title} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {displayImages.length > 1 && (
          <div className="pd-dots">
            {displayImages.map((_, i) => (
              <button key={i} type="button" onClick={() => setActiveIdx(i)}
                style={{ width: activeIdx === i ? 22 : 8, height: 8, borderRadius: 99, background: activeIdx === i ? "#0033a0" : "#d1d5db", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════ PRODUCT INFO & ACTIONS ═══════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {product.brand && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>
            {product.brand}
          </div>
        )}

        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1.25, margin: 0 }}>
          {product.title}
        </h1>

        {product.rating && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} style={{ fontSize: 14, color: s <= Math.round(product.rating ?? 0) ? "#f59e0b" : "#d1d5db" }}>★</span>
              ))}
            </div>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              {product.rating.toFixed(1)}
              {product.rating_number ? ` (${product.rating_number.toLocaleString()} reviews)` : ""}
            </span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5 }}>
            {formatCurrency(displayPrice)}
          </span>
          {displayCompare && displayCompare > displayPrice && (
            <span style={{ fontSize: 18, color: "#94a3b8", textDecoration: "line-through", fontWeight: 400 }}>
              {formatCurrency(displayCompare)}
            </span>
          )}
        </div>

        {product.short_description && (
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
            {product.short_description}
          </p>
        )}

        {attrKeys.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {attrKeys.map((attrKey) => {
              const values = Array.from(new Set(activeVariants.map((v) => v.attributes[attrKey]).filter(Boolean)));
              return (
                <div key={attrKey}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "capitalize" }}>
                    {attrKey}:{" "}
                    <span style={{ fontWeight: 400, color: "#6b7280" }}>{selectedAttrs[attrKey] ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {values.map((val) => {
                      const available = isOptionAvailable(attrKey, val);
                      const selected = selectedAttrs[attrKey] === val;
                      return (
                        <button key={val} type="button" disabled={!available} onClick={() => selectAttr(attrKey, val)}
                          style={{
                            padding: "8px 16px", borderRadius: 10,
                            border: selected ? "2px solid #0f172a" : "1.5px solid #d1d5db",
                            background: selected ? "#0f172a" : "#fff",
                            color: selected ? "#fff" : available ? "#0f172a" : "#9ca3af",
                            fontWeight: selected ? 700 : 500, fontSize: 13,
                            cursor: available ? "pointer" : "not-allowed",
                            opacity: available ? 1 : 0.45, transition: "all 0.15s",
                            position: "relative", textDecoration: !available ? "line-through" : "none",
                          }}>
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div>
          {inStock
            ? <span style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>✓ In Stock ({maxStock} available)</span>
            : <span style={{ fontWeight: 700, color: "#991b1b", fontSize: 14 }}>✗ Out of Stock</span>
          }
        </div>

        {inStock && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Quantity</span>
            <div style={{ display: "flex", alignItems: "center", borderRadius: 12, border: "1.5px solid #e5e7eb", overflow: "hidden" }}>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} style={qtyBtnStyle} disabled={qty <= 1}>−</button>
              <div style={{ minWidth: 52, textAlign: "center", fontWeight: 800, fontSize: 16 }}>{qty}</div>
              <button type="button" onClick={() => setQty((q) => Math.min(maxStock, q + 1))} style={qtyBtnStyle} disabled={qty >= maxStock}>+</button>
            </div>
          </div>
        )}

        {/* ── Add to Cart / Sign In ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* HYDRATING: show neutral skeleton — never flash "Sign in" to real users */}
          {authLoading && (
            <div style={{
              height: 52, borderRadius: 14,
              background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.2s infinite",
            }}>
              <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            </div>
          )}

          {/* GUEST: hydration complete, confirmed unauthenticated */}
          {!authLoading && !user && (
            <div style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 14,
              padding: "18px 20px",
            }}>
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "#78350f", fontWeight: 600 }}>
                Sign in to add this item to your cart
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`)}
                  style={{
                    padding: "13px", borderRadius: 12, border: "none",
                    background: "#0f172a", color: "#fff",
                    fontSize: 15, fontWeight: 800, cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.87"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  🔒 Sign In to Buy
                </button>
                <button
                  onClick={() => router.push(`/register?redirect=${encodeURIComponent(returnUrl)}`)}
                  style={{
                    padding: "12px", borderRadius: 12,
                    border: "1.5px solid #0f172a", background: "#fff",
                    color: "#0f172a", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
                >
                  Create Account — It&apos;s Free
                </button>
              </div>
            </div>
          )}

          {/* AUTHENTICATED: hydration complete, confirmed logged in */}
          {!authLoading && user && (
            <>
              <button
                onClick={handleAdd}
                disabled={!inStock || adding || cartLoading}
                style={{
                  padding: "16px", borderRadius: 14, border: "none",
                  background: inStock ? "#0f172a" : "#9ca3af",
                  color: "#fff", fontSize: 16, fontWeight: 900,
                  cursor: inStock ? "pointer" : "not-allowed",
                  transition: "opacity 0.2s, transform 0.1s",
                  opacity: adding || cartLoading ? 0.75 : 1,
                }}
                onMouseEnter={(e) => { if (inStock) e.currentTarget.style.opacity = "0.87"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = adding ? "0.75" : "1"; }}
              >
                {adding ? "Adding…" : inStock ? "🛒 Add to Cart" : "Unavailable"}
              </button>

              {justAdded && (
                <button
                  onClick={() => router.push("/store/cart")}
                  style={{
                    padding: "16px", borderRadius: 14, border: "2px solid #0f172a",
                    background: "#fff", color: "#0f172a", fontSize: 16, fontWeight: 900,
                    cursor: "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#0f172a"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#0f172a"; }}
                >
                  🛍️ View Cart
                </button>
              )}
            </>
          )}
        </div>

        {(product.sku || product.category) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
            {product.sku && (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>SKU: <span style={{ color: "#64748b" }}>{product.sku}</span></div>
            )}
            {product.category && (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Category: <span style={{ color: "#64748b" }}>{product.category}</span></div>
            )}
          </div>
        )}
      </div>

      <style>{`.product-detail-grid{} @media(max-width:768px){.product-detail-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
}

const qtyBtnStyle: React.CSSProperties = {
  padding: "10px 16px", background: "#fff", border: "none",
  fontWeight: 900, fontSize: 20, cursor: "pointer", color: "#0f172a", lineHeight: 1,
};