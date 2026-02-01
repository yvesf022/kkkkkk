import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartClient from "./AddToCartClient";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES (BACKEND-ALIGNED)
====================== */

type Product = {
  id: string;
  title: string;
  price: number;
  compare_price?: number | null;
  main_image: string;
  category: string;
  stock: number;
  in_stock: boolean;
  description?: string | null;
};

/* ======================
   DATA FETCH
====================== */

async function getProductById(id: string): Promise<Product | null> {
  const res = await fetch(`${API}/api/products`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const products: Product[] = await res.json();
  return products.find((p) => p.id === id) ?? null;
}

/* ======================
   PAGE
====================== */

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProductById(params.id);

  if (!product) {
    notFound();
  }

  const imageUrl = product.main_image.startsWith("http")
    ? product.main_image
    : `${API}${product.main_image}`;

  return (
    <div style={{ display: "grid", gap: 32 }}>
      {/* ===== BREADCRUMB ===== */}
      <nav style={{ fontSize: 14, opacity: 0.7 }}>
        <Link href="/store">Store</Link>
        {" / "}
        <Link href={`/store/${product.category}`}>
          {product.category}
        </Link>
        {" / "}
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
              M {Math.round(product.price).toLocaleString("en-ZA")}
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
          {product.in_stock && product.stock > 0 ? (
            <p style={{ color: "#16a34a", fontWeight: 700 }}>
              In stock
            </p>
          ) : (
            <p style={{ color: "#dc2626", fontWeight: 700 }}>
              Out of stock
            </p>
          )}

          {/* ACTIONS (CLIENT) */}
          <AddToCartClient product={product} />
        </div>
      </div>

      {/* ===== DESCRIPTION ===== */}
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
