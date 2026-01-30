"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating: number;
  stock: number;
};

export default function AdminProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ======================
     LOAD PRODUCT
  ====================== */
  useEffect(() => {
    fetch(`${API}/api/products`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((products: Product[]) => {
        const found = products.find((p) => p.id === id);
        if (!found) {
          toast.error("Product not found");
          router.replace("/admin/products");
          return;
        }
        setProduct(found);
      })
      .catch(() =>
        toast.error("Failed to load product")
      )
      .finally(() => setLoading(false));
  }, [id, router]);

  /* ======================
     SAVE CHANGES
  ====================== */
  async function save() {
    if (!product) return;

    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/products/${product.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(product),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Product updated");
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading product…</p>;
  if (!product) return null;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 720 }}>
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Edit Product
        </h1>
        <p style={{ opacity: 0.6 }}>
          Update product details and inventory
        </p>
      </header>

      {/* FORM */}
      <section className="card" style={{ display: "grid", gap: 14 }}>
        <input
          value={product.title}
          onChange={(e) =>
            setProduct({ ...product, title: e.target.value })
          }
          placeholder="Product title"
        />

        <input
          type="number"
          value={product.price}
          onChange={(e) =>
            setProduct({
              ...product,
              price: Number(e.target.value),
            })
          }
          placeholder="Price"
        />

        <input
          value={product.category}
          onChange={(e) =>
            setProduct({
              ...product,
              category: e.target.value,
            })
          }
          placeholder="Category"
        />

        <input
          type="number"
          value={product.rating}
          onChange={(e) =>
            setProduct({
              ...product,
              rating: Number(e.target.value),
            })
          }
          placeholder="Rating"
        />

        <input
          type="number"
          value={product.stock}
          onChange={(e) =>
            setProduct({
              ...product,
              stock: Number(e.target.value),
            })
          }
          placeholder="Stock"
        />

        {/* IMAGE */}
        <ProductImageUploader
          value={product.img}
          onChange={(url) =>
            setProduct({ ...product, img: url })
          }
        />

        <button
          className="btn btnTech"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </section>
    </div>
  );
}
