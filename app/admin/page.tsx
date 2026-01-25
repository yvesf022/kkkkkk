"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL;

/* =======================
   PAGE
======================= */

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // product
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [varieties, setVarieties] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [csv, setCsv] = useState<File | null>(null);

  /* =======================
     AUTH
  ======================= */

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
      toast.success("Admin authenticated");
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  /* =======================
     ADD PRODUCT
  ======================= */

  async function addProduct() {
    if (!image) {
      toast.error("Product image is required");
      return;
    }

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

      toast.success("Product created");

      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setVarieties("");
      setImage(null);
    } catch {
      toast.error("Failed to create product");
    }
  }

  /* =======================
     BULK UPLOAD
  ======================= */

  async function bulkUpload() {
    if (!csv) {
      toast.error("CSV file required");
      return;
    }

    const fd = new FormData();
    fd.append("csv", csv);

    try {
      await fetch(`${API}/api/products/bulk`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      toast.success("Bulk upload completed");
      setCsv(null);
    } catch {
      toast.error("Bulk upload failed");
    }
  }

  /* =======================
     LOGIN VIEW
  ======================= */

  if (!token) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 28,
            borderRadius: 18,
            background: "linear-gradient(135deg,#ffffff,#f8fbff)",
            boxShadow: "0 18px 50px rgba(15,23,42,0.16)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>
            Admin Login
          </h1>

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <input
              className="pill"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="pill"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              className="btn btnTech"
              disabled={loading}
              onClick={login}
            >
              {loading ? "Authenticating…" : "Login"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* =======================
     ADMIN PANEL
  ======================= */

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "32px auto",
        display: "grid",
        gap: 24,
      }}
    >
      {/* HEADER */}
      <section
        style={{
          padding: 20,
          borderRadius: 18,
          background: "linear-gradient(135deg,#f8fbff,#eef6ff)",
          boxShadow: "0 14px 40px rgba(15,23,42,0.14)",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>
          Admin Dashboard
        </h1>

        <p style={{ marginTop: 4, color: "rgba(15,23,42,0.6)" }}>
          Manage products and inventory
        </p>
      </section>

      {/* ADD PRODUCT */}
      <section
        style={{
          padding: 24,
          borderRadius: 18,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
          display: "grid",
          gap: 12,
        }}
      >
        <h2 style={{ fontWeight: 900 }}>Add Product</h2>

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

        <input
          type="file"
          className="pill"
          onChange={(e) =>
            setImage(e.target.files?.[0] || null)
          }
        />

        <button className="btn btnTech" onClick={addProduct}>
          Add Product
        </button>
      </section>

      {/* BULK UPLOAD */}
      <section
        style={{
          padding: 24,
          borderRadius: 18,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
          display: "grid",
          gap: 12,
        }}
      >
        <h2 style={{ fontWeight: 900 }}>
          Bulk Upload (CSV)
        </h2>

        <input
          type="file"
          className="pill"
          onChange={(e) =>
            setCsv(e.target.files?.[0] || null)
          }
        />

        <button className="btn btnGhost" onClick={bulkUpload}>
          Upload CSV
        </button>
      </section>
    </div>
  );
}
