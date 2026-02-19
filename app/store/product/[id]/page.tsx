import { notFound } from "next/navigation";
import Link from "next/link";
import { productsApi } from "@/lib/api";
import type { Product } from "@/lib/types";
import AddToCartClient from "./AddToCartClient";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: Props) {
  let product: Product;
  try {
    product = await productsApi.get(params.id);
  } catch {
    notFound();
  }

  return (
    <div style={{ background: "#fafaf8", minHeight: "100vh", paddingBottom: 80 }}>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid #e5e7eb", padding: "12px 0", marginBottom: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#94a3b8" }}>
          <Link href="/store" style={{ color: "#64748b", textDecoration: "none" }}>Store</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/store/${encodeURIComponent(product.category)}`} style={{ color: "#64748b", textDecoration: "none" }}>
                {product.category}
              </Link>
            </>
          )}
          <span>/</span>
          <span style={{ color: "#0f172a", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.title}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {/* All interactive product detail: images, variants, add-to-cart */}
        <AddToCartClient product={product} />

        {/* ── Description ── */}
        {(product.description || product.short_description) && (
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>
              About this product
            </h2>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.75, maxWidth: 740, margin: 0 }}>
              {product.description ?? product.short_description}
            </p>
          </div>
        )}

        {/* ── Features ── */}
        {Array.isArray(product.features) && (product.features as string[]).length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>Features</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {(product.features as string[]).map((f, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "#475569" }}>
                  <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: "50%", background: "#0f172a", flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Specifications ── */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>Specifications</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                    {key.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{String(val)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}