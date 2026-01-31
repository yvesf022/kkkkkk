import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_URL!;

async function getProduct(id: string) {
  const res = await fetch(`${API}/api/products/${id}`, {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  // 🚫 Invalid product ID → real 404
  if (!product) {
    notFound();
  }

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
            borderRadius: 8,
            padding: 12,
          }}
        >
          <Image
            src={product.main_image}
            alt={product.title}
            width={400}
            height={400}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* INFO */}
        <div style={{ display: "grid", gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            {product.title}
          </h1>

          {product.brand && (
            <p style={{ opacity: 0.6 }}>
              Brand: <strong>{product.brand}</strong>
            </p>
          )}

          <p style={{ fontSize: 24, fontWeight: 700 }}>
            ${product.price}
          </p>

          {product.compare_price && (
            <p style={{ textDecoration: "line-through", opacity: 0.5 }}>
              ${product.compare_price}
            </p>
          )}

          {/* STOCK */}
          {product.in_stock ? (
            <p style={{ color: "green", fontWeight: 600 }}>
              In stock
            </p>
          ) : (
            <p style={{ color: "red", fontWeight: 600 }}>
              Out of stock
            </p>
          )}

          {/* ACTIONS */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              disabled={!product.in_stock}
              style={{
                padding: "12px 20px",
                background: product.in_stock ? "#ffd814" : "#ccc",
                border: "1px solid #fcd200",
                fontWeight: 700,
                cursor: product.in_stock ? "pointer" : "not-allowed",
              }}
            >
              Add to Cart
            </button>

            <button
              style={{
                padding: "12px 20px",
                border: "1px solid #ddd",
                background: "#fff",
              }}
            >
              Add to Wishlist
            </button>
          </div>
        </div>
      </div>

      {/* ===== DESCRIPTION ===== */}
      {product.description && (
        <section style={{ maxWidth: 900 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>
            Product Description
          </h2>
          <p style={{ opacity: 0.8 }}>{product.description}</p>
        </section>
      )}

      {/* ===== SPECS ===== */}
      {product.specs && Object.keys(product.specs).length > 0 && (
        <section style={{ maxWidth: 900 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>
            Specifications
          </h2>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(product.specs).map(
                ([key, value]) => (
                  <tr key={key}>
                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #eee",
                        fontWeight: 600,
                        width: "30%",
                      }}
                    >
                      {key}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {String(value)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
