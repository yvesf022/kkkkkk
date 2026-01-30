"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating: number;
  stock: number;
  in_stock: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/products`, {
      credentials: "include", // 🔐 admin cookie
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setProducts)
      .catch(() =>
        toast.error("Failed to load products")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading products…</p>;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>
            Products
          </h1>
          <p style={{ opacity: 0.6 }}>
            Manage catalog and inventory
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="btn btnTech"
        >
          + Add Product
        </Link>
      </header>

      {/* TABLE */}
      {products.length === 0 ? (
        <div className="card">No products found.</div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th align="left">Product</th>
                <th align="left">Category</th>
                <th align="left">Price</th>
                <th align="left">Stock</th>
                <th align="left">Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <td style={{ padding: "12px 0" }}>
                    <div style={{ fontWeight: 800 }}>
                      {p.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.6,
                      }}
                    >
                      Rating: {p.rating}
                    </div>
                  </td>

                  <td>{p.category}</td>

                  <td>M{p.price.toLocaleString()}</td>

                  <td>{p.stock}</td>

                  <td>
                    {p.in_stock ? (
                      <span
                        style={{
                          color: "#166534",
                          fontWeight: 700,
                        }}
                      >
                        In stock
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#991b1b",
                          fontWeight: 700,
                        }}
                      >
                        Out of stock
                      </span>
                    )}
                  </td>

                  <td>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="btn btnGhost"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
