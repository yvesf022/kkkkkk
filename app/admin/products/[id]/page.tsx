"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  rating: number;
};

export default function AdminEditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  /* ======================
     LOAD PRODUCT
  ====================== */
  async function loadProduct() {
    try {
      const res = await fetch(`${API}/api/products`);
      const data: Product[] = await res.json();
      const found = data.find((p) => p.id === id);

      if (!found) throw new Error();

      setProduct(found);
    } catch {
      toast.error("Product not found");
      router.push("/admin/products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduct();
  }, [id]);

  /* ======================
     SAVE CHANGES
  ====================== */
  async function saveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !product) return;

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/products/${product.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: product.title,
          price: product.price,
          category: product.category,
          img: product.img,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Product updated");
      router.push("/admin/products");
    } catch {
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     DELETE PRODUCT
  ====================== */
  async function deleteProduct() {
    if (!token || !product) return;

    if (!confirm("Delete this product permanently?")) return;

    try {
      const res = await fetch(`${API}/api/products/${product.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      toast.success("Product deleted");
      router.push("/admin/products");
    } catch {
      toast.error("Failed to delete product");
    }
  }

  if (loading) return <p>Loading product…</p>;
  if (!product) return null;

  return (
    <div style={{ maxWidth: 520, display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>
          Edit Product
        </h1>
      </header>

      <form
        onSubmit={saveChanges}
        style={{ display: "grid", gap: 14 }}
        className="card"
      >
        <input
          value={product.title}
          onChange={(e) =>
            setProduct({ ...product, title: e.target.value })
          }
          placeholder="Title"
          required
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
          required
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
          required
        />

        <input
          value={product.img}
          onChange={(e) =>
            setProduct({ ...product, img: e.target.value })
          }
          placeholder="Image URL"
          required
        />

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
          }}
        >
          <button
            className="btn btnTech"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <button
            type="button"
            className="btn btnGhost"
            onClick={deleteProduct}
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
