"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { productsApi } from "@/lib/api";

type AdminProduct = {
  id: string;
  title: string;
  short_description?: string | null;
  price: number;
  category?: string | null;
  stock: number;
  brand?: string | null;
  images?: string[];
  main_image?: string | null;
  status?: "active" | "inactive" | "discontinued";

  store?: string | null;
  main_category?: string | null;
  categories?: string[];
  features?: string[];
  details?: Record<string, any>;
  parent_asin?: string | null;
  rating_number?: number;
};

export default function AdminProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [original, setOriginal] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const found = await productsApi.get(id);

        const mapped: AdminProduct = {
          ...found,
          categories: found.categories || [],
          features: found.features || [],
          details: found.details || {},
          rating_number: found.rating_number || 0,
        };

        setProduct(mapped);
        setOriginal(mapped);
      } catch (err: any) {
        toast.error("Product not found");
        router.replace("/admin/products");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  const dirty =
    JSON.stringify(product) !== JSON.stringify(original);

  async function save() {
    if (!product) return;

    if (product.price < 0 || product.stock < 0) {
      toast.error("Price and stock must be non-negative");
      return;
    }

    setSaving(true);

    try {
      await productsApi.update(product.id, {
        ...product,
      });

      toast.success("Product updated successfully");
      setOriginal(product);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !product) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading product...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 24 }}>
        Edit Product
      </h1>

      {/* IMAGE PREVIEW */}
      {product.images && product.images.length > 0 && (
        <Section title="Product Images">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
              gap: 16,
            }}
          >
            {product.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="Product"
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
            ))}
          </div>
        </Section>
      )}

      <div style={{ display: "grid", gap: 24 }}>
        <Section title="Basic Information">
          <Input
            label="Title"
            value={product.title}
            onChange={(v: string) =>
              setProduct({ ...product, title: v })
            }
          />

          <Textarea
            label="Short Description"
            value={product.short_description || ""}
            onChange={(v: string) =>
              setProduct({ ...product, short_description: v })
            }
          />
        </Section>

        <Section title="Pricing & Inventory">
          <PriceInput
            value={product.price}
            onChange={(v: number) =>
              setProduct({ ...product, price: v })
            }
          />

          <Input
            label="Stock"
            type="number"
            value={product.stock}
            onChange={(v: string) =>
              setProduct({
                ...product,
                stock: parseInt(v) || 0,
              })
            }
          />
        </Section>

        <Section title="Organization">
          <Input
            label="Category"
            value={product.category || ""}
            onChange={(v: string) =>
              setProduct({ ...product, category: v })
            }
          />

          <Input
            label="Brand"
            value={product.brand || ""}
            onChange={(v: string) =>
              setProduct({ ...product, brand: v })
            }
          />

          <Input
            label="Store"
            value={product.store || ""}
            onChange={(v: string) =>
              setProduct({ ...product, store: v })
            }
          />

          <Input
            label="Main Category"
            value={product.main_category || ""}
            onChange={(v: string) =>
              setProduct({
                ...product,
                main_category: v,
              })
            }
          />
        </Section>

        <Section title="Amazon Advanced">
          <Input
            label="Parent ASIN"
            value={product.parent_asin || ""}
            onChange={(v: string) =>
              setProduct({
                ...product,
                parent_asin: v,
              })
            }
          />

          <Textarea
            label="Features (one per line)"
            value={(product.features || []).join("\n")}
            onChange={(v: string) =>
              setProduct({
                ...product,
                features: v.split("\n"),
              })
            }
          />

          <Textarea
            label="Details (JSON)"
            value={JSON.stringify(
              product.details || {},
              null,
              2
            )}
            onChange={(v: string) => {
              try {
                const parsed = JSON.parse(v);
                setProduct({
                  ...product,
                  details: parsed,
                });
              } catch {}
            }}
          />

          <RatingDisplay count={product.rating_number || 0} />
        </Section>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() =>
              router.push("/admin/products")
            }
            style={btnGhost}
          >
            Cancel
          </button>

          <button
            disabled={!dirty || saving}
            onClick={save}
            style={btnPrimary}
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* COMPONENTS */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={sectionStyle}>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={{ display: "grid", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function PriceInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>Price (M)</label>
      <div style={{ position: "relative" }}>
        <span style={currencySymbol}>M</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) =>
            onChange(parseFloat(e.target.value) || 0)
          }
          style={{
            ...inputStyle,
            paddingLeft: 28,
          }}
        />
      </div>
    </div>
  );
}

function RatingDisplay({ count }: { count: number }) {
  return (
    <div>
      <label style={labelStyle}>Rating Count</label>
      <div style={{ fontSize: 16 }}>
        ⭐ {count.toLocaleString()}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: any) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function Textarea({ label, value, onChange }: any) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "#ffffff",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: 14,
};

const currencySymbol: React.CSSProperties = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  fontWeight: 900,
  opacity: 0.7,
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: 10,
  background: "#111827",
  color: "white",
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: 10,
  background: "transparent",
  border: "1px solid rgba(0,0,0,0.2)",
  fontWeight: 800,
  cursor: "pointer",
};
