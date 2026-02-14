import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartClient from "./AddToCartClient";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   VALIDATE UUID
====================== */

function isValidUUID(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

/* ======================
   DATA FETCH
====================== */

async function getProductById(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API}/api/products/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data: Product = await res.json();
    return data;
  } catch {
    return null;
  }
}

/* ======================
   PAGE
====================== */

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params?.id;

  // 🔒 Prevent backend crash
  if (!id || !isValidUUID(id)) {
    notFound();
  }

  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const imageUrl =
    product.main_image && product.main_image.startsWith("http")
      ? product.main_image
      : product.main_image
      ? `${API}${product.main_image}`
      : "/placeholder.png";

  const isInStock = product.stock > 0;

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* ===== BREADCRUMB ===== */}
      <nav style={{ fontSize: 14, opacity: 0.7 }}>
        <Link href="/store">Store</Link>
        {" / "}
        {product.category && (
          <>
            <Link href={`/store/${product.category}`}>
              {product.category}
            </Link>
            {" / "}
          </>
        )}
        <span>{product.title}</span>
      </nav>

      {/* ===== PRODUCT MAIN ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 420px) 1fr",
          gap: 40,
        }}
      >
        {/* IMAGE */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 16,
            background: "#fff",
          }}
        >
          <Image
            src={imageUrl}
            alt={product.title}
            width={600}
            height={600}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* INFO */}
        <div style={{ display: "grid", gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            {product.title}
          </h1>

          {/* PRICE */}
          <div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>
              M{" "}
              {Math.round(product.price).toLocaleString("en-ZA")}
            </div>

            {product.compare_price && (
              <div
                style={{
                  opacity: 0.5,
                  textDecoration: "line-through",
                }}
              >
                M{" "}
                {Math.round(product.compare_price).toLocaleString(
                  "en-ZA"
                )}
              </div>
            )}
          </div>

          {/* STOCK */}
          {isInStock ? (
            <p style={{ color: "#16a34a", fontWeight: 700 }}>
              In stock
            </p>
          ) : (
            <p style={{ color: "#dc2626", fontWeight: 700 }}>
              Out of stock
            </p>
          )}

          {/* ACTIONS */}
          <AddToCartClient
            product={{
              id: product.id,
              title: product.title,
              price: product.price,
              main_image: product.main_image || "",
              in_stock: product.in_stock,
              stock: product.stock,
            }}
          />
        </div>
      </div>

      {/* DESCRIPTION */}
      {product.description && (
        <section style={{ maxWidth: 900 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>
            Product Description
          </h2>
          <p style={{ opacity: 0.8 }}>
            {product.description}
          </p>
        </section>
      )}
    </div>
  );
}
