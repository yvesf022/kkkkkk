"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ======================
   TYPES
====================== */

type Product = {
  id: string;
  title: string;
  price: number;
  img: string;
  category: string;
  stock: number;
  rating?: number;
  sku?: string;
  brand?: string;
  description?: string;
};

export default function AdminProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [original, setOriginal] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ======================
     LOAD PRODUCT
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

        const found = data.find((p: Product) => p.id === id);

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

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () =>
      window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  /* ======================
     SAVE
  ====================== */
  async function save() {
    if (!product) return;

    if (product.price < 0 || product.stock < 0) {
      toast.error("Price and stock must be positive");
      return;
    }

    if (
      product.rating &&
      (product.rating < 1 || product.rating > 5)
    ) {
      toast.error("Rating must be between 1 and 5");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/products/${product.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to save product");
      }

      toast.success(
        data?.message || "Product updated successfully"
      );

      setOriginal(product);
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading product…</p>;
  if (!product) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: 28,
        maxWidth: 760,
      }}
    >
      {/* HEADER */}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>
          Edit Product
        </h1>
        <p style={{ opacity: 0.6 }}>
          Manage pricing, inventory, and visibility
        </p>
      </header>

      {/* IDENTITY */}
      <section className="card">
        <h3>Product Identity</h3>
        <input
          value={product.title}
          onChange={(e) =>
            setProduct({ ...product, title: e.target.value })
          }
        />
        <input
          value={product.category}
          onChange={(e) =>
            setProduct({ ...product, category: e.target.value })
          }
        />
        <input
          placeholder="Brand"
          value={product.brand || ""}
          onChange={(e) =>
            setProduct({ ...product, brand: e.target.value })
          }
        />
        <input
          placeholder="SKU"
          value={product.sku || ""}
          onChange={(e) =>
            setProduct({ ...product, sku: e.target.value })
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
        <input
          type="number"
          min={1}
          max={5}
          placeholder="Rating (1–5)"
          value={product.rating ?? ""}
          onChange={(e) =>
            setProduct({
              ...product,
              rating: Number(e.target.value),
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

      {/* MEDIA */}
      <section className="card">
        <h3>Product Image</h3>
        <ProductImageUploader
          value={product.img}
          onChange={(url) => {
            setProduct({ ...product, img: url });
            toast.success("Image updated");
          }}
        />
      </section>

      {/* DESCRIPTION */}
      <section className="card">
        <h3>Description</h3>
        <textarea
          value={product.description || ""}
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
          onClick={() => router.push("/admin/products")}
        >
          Back
        </button>

        <button
          className="btn btnTech"
          disabled={saving || !dirty}
          onClick={save}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
