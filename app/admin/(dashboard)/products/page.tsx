"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Product = {
  id: string;
  title: string;
  price: number;
  img: string[];
  category: string;
  stock: number;
  description: string;
  brand: string;
  sku: string;
  rating: number;
  shipping_weight: number;
  tax_rate: number;
  discount_price: number;
  in_stock: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state for product creation
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [rating, setRating] = useState(0);
  const [shippingWeight, setShippingWeight] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [discountPrice, setDiscountPrice] = useState(0);
  const [img, setImg] = useState<string[]>([]);
  const [inStock, setInStock] = useState(true);

  async function loadProducts() {
    try {
      const res = await fetch(`${API}/api/products`);
      setProducts(await res.json());
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();

    if (img.length === 0) {
      toast.error("At least one product image is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        credentials: "include", // ✅ ADMIN COOKIE AUTH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          price: Number(price),
          category,
          stock: Number(stock),
          description,
          brand,
          sku,
          rating,
          shipping_weight: shippingWeight,
          tax_rate: taxRate,
          discount_price: discountPrice,
          img,
          in_stock: inStock,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Product created");
      setTitle("");
      setPrice("");
      setCategory("");
      setStock("");
      setDescription("");
      setBrand("");
      setSku("");
      setRating(0);
      setShippingWeight(0);
      setTaxRate(0);
      setDiscountPrice(0);
      setImg([]);
      setInStock(true);
      loadProducts();
    } catch {
      toast.error("Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Products</h1>
        <p style={{ opacity: 0.6 }}>Full product catalog management</p>
      </header>

      {/* ADD PRODUCT */}
      <section className="card">
        <h3>Add New Product</h3>

        <form onSubmit={addProduct} style={{ display: "grid", gap: 12, maxWidth: 480 }}>
          <input placeholder="Product title" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <input type="number" placeholder="Price (M)" value={price} onChange={(e) => setPrice(e.target.value)} required />

          <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />

          <textarea placeholder="Product description" value={description} onChange={(e) => setDescription(e.target.value)} required />

          <input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />

          <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />

          <input type="number" value={rating} onChange={(e) => setRating(Number(e.target.value))} placeholder="Rating (1-5)" min="1" max="5" />

          <input type="number" placeholder="Stock quantity" value={stock} onChange={(e) => setStock(e.target.value)} required />

          <input type="number" placeholder="Shipping weight (kg)" value={shippingWeight} onChange={(e) => setShippingWeight(Number(e.target.value))} />

          <input type="number" placeholder="Tax rate (%)" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />

          <input type="number" placeholder="Discount price (M)" value={discountPrice} onChange={(e) => setDiscountPrice(Number(e.target.value))} />

          <ProductImageUploader value={img} onChange={setImg} />

          <label>
            In Stock
            <input type="checkbox" checked={inStock} onChange={() => setInStock(!inStock)} />
          </label>

          <button className="btn btnTech" disabled={saving}>
            {saving ? "Saving…" : "Create Product"}
          </button>
        </form>
      </section>

      {/* EXISTING PRODUCTS */}
      <section>
        <h3>Existing Products</h3>
        <div style={{ display: "grid", gap: 14 }}>
          {products.map((p) => (
            <div key={p.id} className="card" style={{ display: "flex", gap: 14 }}>
              <img src={p.img[0]} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 10 }} />

              <div style={{ flex: 1 }}>
                <b>{p.title}</b>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  {p.category} • Stock: {p.stock} • Rating: {p.rating}/5
                </div>
              </div>

              <div style={{ fontWeight: 900 }}>M{p.price}</div>

              <button className="btn btnGhost">Edit</button>
              <button className="btn btnGhost">Delete</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
