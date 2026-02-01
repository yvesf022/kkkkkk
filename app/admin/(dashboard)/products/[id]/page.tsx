"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   BACKEND-ALIGNED TYPE
====================== */

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  in_stock: boolean;
  main_image?: string | null;
};

export default function AdminProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [original, setOriginal] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ======================
     LOAD PRODUCT (ADMIN)
  ====================== */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/products`, {
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load products");
        }

        const found = data.find(
          (p: Product) => p.id === id
        );

        if (!found) {
          toast.error("Product not found");
          router.replace("/admin/products");
          return;
        }

        setProduct(found);
        setOriginal(found);
      } catch (err: any) {
        toast.error(err.message || "Failed to load product");
        router.replace("/admin/products");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  /* ======================
     DIRTY CHECK
  ====================== */
  const dirty =
    JSON.stringify(product) !== JSON.stringify(original);

  /* ======================
     SAVE (PATCH)
  ====================== */
  async function save() {
    if (!product) return;

    if (product.price < 0 || product.stock < 0) {
      toast.error("Price and stock must be non-negative");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/products/admin/${product.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            stock: product.stock,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Update failed");
      }

      toast.success("Product updated");
      setOriginal(product);
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading product…</p>;
  if (!product) return null;

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 720 }}>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Edit Product
        </h1>
        <p style={{ opacity: 0.6 }}>
          Manage core product data
        </p>
      </header>

      {/* IDENTITY */}
      <section className="card">
        <h3>Identity</h3>

        <input
          value={product.title}
          onChange={(e) =>
            setProduct({
              ...product,
              title: e.target.value,
            })
          }
        />

        <input
          value={product.category}
          onChange={(e) =>
            setProduct({
              ...product,
              category: e.target.value,
            })
          }
        />
      </section>

      {/* PRICING */}
      <section className="card">
        <h3>Pricing</h3>

        <input
          type="number"
          min={0}
          value={product.price}
          onChange={(e) =>
            setProduct({
              ...product,
              price: Number(e.target.value),
            })
          }
        />
      </section>

      {/* INVENTORY */}
      <section className="card">
        <h3>Inventory</h3>

        <input
          type="number"
          min={0}
          value={product.stock}
          onChange={(e) =>
            setProduct({
              ...product,
              stock: Number(e.target.value),
            })
          }
        />
      </section>

      {/* DESCRIPTION */}
      <section className="card">
        <h3>Description</h3>

        <textarea
          value={product.description}
          onChange={(e) =>
            setProduct({
              ...product,
              description: e.target.value,
            })
          }
        />
      </section>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <button
          className="btn btnGhost"
          onClick={() =>
            router.push("/admin/products")
          }
        >
          Back
        </button>

        <button
          className="btn btnTech"
          disabled={!dirty || saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
