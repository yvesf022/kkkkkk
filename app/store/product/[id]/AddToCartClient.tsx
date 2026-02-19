"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { Product, ProductVariant } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";

interface Props {
  product: Product;
}

/* ── helpers ──────────────────────────────────────────────────── */

/** Resolve all displayable image URLs from the product, best-first. */
function resolveImages(product: Product): string[] {
  const urls: string[] = [];

  if (product.images && product.images.length > 0) {
    const sorted = [...product.images].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.position - b.position;
    });
    sorted.forEach((img) => { if (img.image_url) urls.push(img.image_url); });
  }

  // Fall back to main_image if not already present
  if (product.main_image && !urls.includes(product.main_image)) {
    urls.unshift(product.main_image);
  }

  return urls;
}

/** Safe image component — falls back to placeholder on broken URLs */
function SafeImage({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 56,
          background: "#f1f5f9",
          ...style,
        }}
      >
        📦
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        ...style,
      }}
    />
  );
}

/* ── main component ───────────────────────────────────────────── */

export default function AddToCartClient({ product }: Props) {
  const addItem = useCart((s) => s.addItem);
  const cartLoading = useCart((s) => s.loading);

  /* images */
  const allImages = resolveImages(product);
  const [activeIdx, setActiveIdx] = useState(0);

  /* variants */
  const activeVariants =
    product.variants?.filter((v) => !v.is_deleted && v.is_active) ?? [];

  /* attribute groups for multi-dimensional variant selectors */
  const attrKeys = Array.from(
    new Set(activeVariants.flatMap((v) => Object.keys(v.attributes)))
  );

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>(
    () => {
      if (activeVariants.length === 0) return {};
      // Default: first in-stock variant or first variant
      const defaultV =
        activeVariants.find((v) => v.in_stock) ?? activeVariants[0];
      return { ...defaultV.attributes };
    }
  );

  /** Find variant that exactly matches current attribute selection */
  const resolvedVariant: ProductVariant | null =
    activeVariants.find((v) =>
      attrKeys.every((k) => v.attributes[k] === selectedAttrs[k])
    ) ?? null;

  /* When a variant has its own image, show it as the active image */
  const variantImageUrl = resolvedVariant?.image_url ?? null;
  const displayImages =
    variantImageUrl && !allImages.includes(variantImageUrl)
      ? [variantImageUrl, ...allImages]
      : allImages;

  /* qty */
  const [qty, setQty] = useState(1);

  /* action state */
  const [adding, setAdding] = useState(false);

  /* derived stock info */
  const inStock = resolvedVariant
    ? resolvedVariant.in_stock && resolvedVariant.stock > 0
    : product.in_stock && product.stock > 0;
  const maxStock = resolvedVariant?.stock ?? product.stock;

  const displayPrice = resolvedVariant?.price ?? product.price;
  const displayCompare =
    resolvedVariant?.compare_price ?? product.compare_price;
  const discountPct =
    displayCompare && displayCompare > displayPrice
      ? Math.round(((displayCompare - displayPrice) / displayCompare) * 100)
      : null;

  /* ── attribute selector ───────────────────────── */
  function selectAttr(key: string, value: string) {
    setSelectedAttrs((prev) => ({ ...prev, [key]: value }));
    setQty(1); // reset qty on variant change
  }

  /** Is a particular option available (in-stock) given other current selections? */
  function isOptionAvailable(key: string, value: string) {
    return activeVariants.some(
      (v) =>
        v.attributes[key] === value &&
        attrKeys
          .filter((k) => k !== key)
          .every((k) => !selectedAttrs[k] || v.attributes[k] === selectedAttrs[k]) &&
        v.in_stock &&
        v.stock > 0
    );
  }

  /* ── add to cart ──────────────────────────────── */
  async function handleAdd() {
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add to cart. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  /* ── render ────────────────────────────────────── */
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 48,
        alignItems: "start",
      }}
      className="product-detail-grid"
    >
      {/* ═══════════════ IMAGE GALLERY ═══════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Main image */}
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
            position: "relative",
          }}
        >
          {displayImages.length > 0 ? (
            <SafeImage
              src={displayImages[activeIdx] ?? displayImages[0]}
              alt={product.title}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 72,
                background: "#f1f5f9",
              }}
            >
              📦
            </div>
          )}

          {/* Discount badge */}
          {discountPct && (
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                background: "#dc2626",
                color: "#fff",
                borderRadius: 8,
                padding: "4px 10px",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              -{discountPct}%
            </div>
          )}
        </div>

        {/* Thumbnails — only show if there are multiple images */}
        {displayImages.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {displayImages.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                style={{
                  flexShrink: 0,
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  overflow: "hidden",
                  border:
                    activeIdx === i
                      ? "2px solid #0f172a"
                      : "2px solid transparent",
                  background: "#f1f5f9",
                  cursor: "pointer",
                  padding: 0,
                  transition: "border-color 0.15s",
                }}
              >
                <SafeImage src={url} alt={`${product.title} ${i + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════ PRODUCT INFO & ACTIONS ═══════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Brand */}
        {product.brand && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {product.brand}
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: "#0f172a",
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {product.title}
        </h1>

        {/* Rating */}
        {product.rating && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 14,
                    color:
                      s <= Math.round(product.rating ?? 0)
                        ? "#f59e0b"
                        : "#d1d5db",
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              {product.rating.toFixed(1)}
              {product.rating_number
                ? ` (${product.rating_number.toLocaleString()} reviews)`
                : ""}
            </span>
          </div>
        )}

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: -0.5,
            }}
          >
            {formatCurrency(displayPrice)}
          </span>
          {displayCompare && displayCompare > displayPrice && (
            <span
              style={{
                fontSize: 18,
                color: "#94a3b8",
                textDecoration: "line-through",
                fontWeight: 400,
              }}
            >
              {formatCurrency(displayCompare)}
            </span>
          )}
        </div>

        {/* Short description */}
        {product.short_description && (
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
            {product.short_description}
          </p>
        )}

        {/* ── VARIANT SELECTORS ── */}
        {attrKeys.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {attrKeys.map((attrKey) => {
              // All distinct values for this attribute key
              const values = Array.from(
                new Set(activeVariants.map((v) => v.attributes[attrKey]).filter(Boolean))
              );

              return (
                <div key={attrKey}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#374151",
                      marginBottom: 8,
                      textTransform: "capitalize",
                    }}
                  >
                    {attrKey}:{" "}
                    <span style={{ fontWeight: 400, color: "#6b7280" }}>
                      {selectedAttrs[attrKey] ?? "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {values.map((val) => {
                      const available = isOptionAvailable(attrKey, val);
                      const selected = selectedAttrs[attrKey] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!available}
                          onClick={() => selectAttr(attrKey, val)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: selected
                              ? "2px solid #0f172a"
                              : "1.5px solid #d1d5db",
                            background: selected ? "#0f172a" : "#fff",
                            color: selected ? "#fff" : available ? "#0f172a" : "#9ca3af",
                            fontWeight: selected ? 700 : 500,
                            fontSize: 13,
                            cursor: available ? "pointer" : "not-allowed",
                            opacity: available ? 1 : 0.45,
                            transition: "all 0.15s",
                            position: "relative",
                            textDecoration: !available ? "line-through" : "none",
                          }}
                        >
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

        {/* Stock status */}
        <div>
          {inStock ? (
            <span style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>
              ✓ In Stock ({maxStock} available)
            </span>
          ) : (
            <span style={{ fontWeight: 700, color: "#991b1b", fontSize: 14 }}>
              ✗ Out of Stock
            </span>
          )}
        </div>

        {/* Quantity selector */}
        {inStock && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Quantity</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 12,
                border: "1.5px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={qtyBtnStyle}
                disabled={qty <= 1}
              >
                −
              </button>
              <div
                style={{
                  minWidth: 52,
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                {qty}
              </div>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxStock, q + 1))}
                style={qtyBtnStyle}
                disabled={qty >= maxStock}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Add to cart button */}
        <button
          onClick={handleAdd}
          disabled={!inStock || adding || cartLoading}
          style={{
            padding: "16px",
            borderRadius: 14,
            border: "none",
            background: inStock ? "#0f172a" : "#9ca3af",
            color: "#fff",
            fontSize: 16,
            fontWeight: 900,
            cursor: inStock ? "pointer" : "not-allowed",
            transition: "opacity 0.2s, transform 0.1s",
            opacity: adding || cartLoading ? 0.75 : 1,
          }}
          onMouseEnter={(e) => {
            if (inStock) e.currentTarget.style.opacity = "0.87";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = adding ? "0.75" : "1";
          }}
        >
          {adding ? "Adding…" : inStock ? "🛒 Add to Cart" : "Unavailable"}
        </button>

        {/* Meta info */}
        {(product.sku || product.category) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
            {product.sku && (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                SKU: <span style={{ color: "#64748b" }}>{product.sku}</span>
              </div>
            )}
            {product.category && (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Category: <span style={{ color: "#64748b" }}>{product.category}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Responsive: collapse to single column on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .product-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const qtyBtnStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "#fff",
  border: "none",
  fontWeight: 900,
  fontSize: 20,
  cursor: "pointer",
  color: "#0f172a",
  lineHeight: 1,
};