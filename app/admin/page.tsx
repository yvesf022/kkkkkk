"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // product form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [varieties, setVarieties] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [csv, setCsv] = useState<File | null>(null);

  async function login() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error();

      setToken(data.token);
      toast.success("Admin logged in");
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function addProduct() {
    if (!image) return toast.error("Image required");

    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("price", price);
    fd.append("category", category);
    fd.append("varieties", varieties);
    fd.append("image", image);

    try {
      await fetch(`${API}/api/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      toast.success("Product added");
      setTitle(""); setDescription(""); setPrice("");
      setCategory(""); setVarieties(""); setImage(null);
    } catch {
      toast.error("Failed to add product");
    }
  }

  async function bulkUpload() {
    if (!csv) return toast.error("CSV required");

    const fd = new FormData();
    fd.append("csv", csv);

    try {
      await fetch(`${API}/api/products/bulk`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      toast.success("Bulk upload successful");
      setCsv(null);
    } catch {
      toast.error("Bulk upload failed");
    }
  }

  if (!token) {
    return (
      <div className="container glass neon-border">
        <h1 className="neon-text">Admin Login</h1>

        <input className="pill" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input className="pill" placeholder="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} />

        <button className="btn btnPrimary" disabled={loading} onClick={login}>
          {loading ? "Logging in…" : "Login"}
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="glass neon-border">
        <h2>Add Product</h2>

        <input className="pill" placeholder="Title" value={title}
          onChange={(e) => setTitle(e.target.value)} />
        <input className="pill" placeholder="Price" value={price}
          onChange={(e) => setPrice(e.target.value)} />
        <input className="pill" placeholder="Category" value={category}
          onChange={(e) => setCategory(e.target.value)} />
        <input className="pill" placeholder="Varieties (S|M|L)" value={varieties}
          onChange={(e) => setVarieties(e.target.value)} />
        <textarea className="pill" placeholder="Description" value={description}
          onChange={(e) => setDescription(e.target.value)} />

        <input type="file" className="pill" onChange={(e) => setImage(e.target.files?.[0] || null)} />

        <button className="btn btnPrimary" onClick={addProduct}>
          Add Product
        </button>
      </div>

      <div className="glass neon-border">
        <h2>Bulk Upload (CSV)</h2>
        <input type="file" className="pill" onChange={(e) => setCsv(e.target.files?.[0] || null)} />
        <button className="btn" onClick={bulkUpload}>Upload CSV</button>
      </div>
    </div>
  );
}
