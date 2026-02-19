"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { reviewsApi, productsApi } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function WriteReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("product_id");

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!!productId);
  const [form, setForm] = useState({ rating: 0, title: "", comment: "" });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!productId) return;
    productsApi.get(productId)
      .then((p) => setProduct(p as Product))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  async function handleSubmit() {
    if (!productId) { toast.error("No product specified"); return; }
    if (form.rating === 0) { toast.error("Please select a star rating"); return; }
    if (!form.comment.trim()) { toast.error("Please write a comment"); return; }

    setSubmitting(true);
    try {
      await reviewsApi.create(productId, {
        rating: form.rating,
        title: form.title || undefined,
        comment: form.comment,
      });
      setSubmitted(true);
      toast.success("Review submitted! Thank you.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✅</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: 0 }}>Review Submitted!</h1>
        <p style={{ color: "#64748b", fontSize: 15, maxWidth: 400 }}>
          Thank you for sharing your feedback. Your review helps other customers make better decisions.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {productId && (
            <Link href={`/store/product/${productId}`} style={primaryLinkBtn}>Back to Product</Link>
          )}
          <Link href="/account/reviews" style={outlineLinkBtn}>My Reviews</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "60px 20px" }}>
      <div style={{ maxWidth: 580, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✏️</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", color: "#0f172a" }}>Write a Review</h1>
          {loading ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading product...</p>
          ) : product ? (
            <p style={{ color: "#64748b", fontSize: 15 }}>
              Reviewing: <strong style={{ color: "#0f172a" }}>{product.title}</strong>
            </p>
          ) : !productId ? (
            <p style={{ color: "#ef4444", fontSize: 14 }}>No product specified. Please navigate here from a product page.</p>
          ) : null}
        </div>

        {/* Product preview */}
        {product && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, marginBottom: 24, display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: 10, background: "#f1f5f9", overflow: "hidden", flexShrink: 0 }}>
              {product.main_image && <img src={product.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{product.title}</div>
              {product.brand && <div style={{ fontSize: 12, color: "#64748b" }}>{product.brand}</div>}
            </div>
          </div>
        )}

        {/* Form */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 32, display: "grid", gap: 24 }}>

          {/* Star rating */}
          <div>
            <label style={labelSt}>Your Rating *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rating: n }))}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(0)}
                  style={{ background: "none", border: "none", fontSize: 40, cursor: "pointer", transition: "transform 0.1s", transform: n <= (hoveredStar || form.rating) ? "scale(1.15)" : "scale(1)" }}
                >
                  <span style={{ color: n <= (hoveredStar || form.rating) ? "#f59e0b" : "#d1d5db", transition: "color 0.1s" }}>★</span>
                </button>
              ))}
            </div>
            {form.rating > 0 && (
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][form.rating]} — {form.rating}/5
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label style={labelSt}>Review Title <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
            <input
              style={inputSt}
              placeholder="Summarize your experience in a few words"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={120}
            />
          </div>

          {/* Comment */}
          <div>
            <label style={labelSt}>Your Review *</label>
            <textarea
              style={{ ...inputSt, height: 120, resize: "vertical" }}
              placeholder="What did you like or dislike? How was the quality? Would you recommend it?"
              value={form.comment}
              onChange={(e) => setForm(f => ({ ...f, comment: e.target.value }))}
              maxLength={2000}
            />
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, textAlign: "right" }}>
              {form.comment.length}/2000
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || form.rating === 0 || !form.comment.trim() || !productId}
            style={{ padding: "14px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", opacity: (submitting || form.rating === 0 || !form.comment.trim() || !productId) ? 0.5 : 1, transition: "opacity 0.15s" }}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>

          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: 0 }}>
            By submitting, you confirm this review is based on your genuine experience.
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 };
const inputSt: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 11, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
const primaryLinkBtn: React.CSSProperties = { padding: "11px 22px", borderRadius: 11, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 };
const outlineLinkBtn: React.CSSProperties = { padding: "11px 22px", borderRadius: 11, border: "1px solid #e5e7eb", color: "#475569", textDecoration: "none", fontWeight: 600, fontSize: 14 };