"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { productsApi, reviewsApi, productQAApi, wishlistApi, cartApi } from "@/lib/api";
import type { Product, ProductListItem, ProductVariant, Review, ProductQuestion } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import ProductCard from "@/components/store/ProductCard";

/* ============================================================
   TYPES
============================================================ */
type Tab = "description" | "reviews" | "qa";

/* ============================================================
   STAR COMPONENT
============================================================ */
function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span style={{ color: "#f59e0b", fontSize: size, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ opacity: n <= Math.round(rating) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */
export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  // Core state
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Image gallery
  const [activeImg, setActiveImg] = useState(0);

  // Variant selection
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Cart
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Wishlist
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  // Q&A
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [submittingQ, setSubmittingQ] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("description");

  /* ---- Load product ---- */
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    productsApi.get(productId)
      .then((data) => {
        const p = data as Product;
        setProduct(p);
        if (p.variants?.length) setSelectedVariant(p.variants[0]);
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [productId]);

  /* ---- Load related ---- */
  useEffect(() => {
    if (!product?.category) return;
    productsApi.list({ category: product.category, per_page: 8 })
      .then((d) => setRelated((d as any).results.filter((p: any) => p.id !== product.id).slice(0, 4)))
      .catch(() => {});
  }, [product]);

  /* ---- Load reviews on tab switch ---- */
  useEffect(() => {
    if (activeTab !== "reviews" || !productId) return;
    setReviewsLoading(true);
    // Reviews live on the product object from the API; we load them from the product
    // The API doesn't have a GET /reviews/products/{id} list endpoint, so we use what we have
    setReviews([]);
    setReviewsLoading(false);
  }, [activeTab, productId]);

  /* ---- Load Q&A on tab switch ---- */
  useEffect(() => {
    if (activeTab !== "qa" || !productId) return;
    setQaLoading(true);
    productQAApi.getQuestions(productId)
      .then((d) => setQuestions((d as any) ?? []))
      .catch(() => {})
      .finally(() => setQaLoading(false));
  }, [activeTab, productId]);

  /* ---- Handlers ---- */
  async function handleAddToCart() {
    if (!product) return;
    setAddingToCart(true);
    try {
      await cartApi.addItem({
        product_id: product.id,
        variant_id: selectedVariant?.id,
        quantity: qty,
      });
      toast.success("Added to cart!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }

  async function handleToggleWishlist() {
    if (!product) return;
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await wishlistApi.remove(product.id);
        setWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        await wishlistApi.add(product.id);
        setWishlisted(true);
        toast.success("Added to wishlist!");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setWishlistLoading(false);
    }
  }

  async function handleSubmitReview() {
    if (!product || !reviewForm.comment) return;
    setSubmittingReview(true);
    try {
      await reviewsApi.create(product.id, reviewForm);
      toast.success("Review submitted!");
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", comment: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleVote(reviewId: string, helpful: boolean) {
    try {
      await reviewsApi.vote(reviewId, helpful);
      toast.success(helpful ? "Marked as helpful" : "Feedback recorded");
    } catch {}
  }

  async function handleAskQuestion() {
    if (!product || !newQuestion.trim()) return;
    setSubmittingQ(true);
    try {
      const q = await productQAApi.askQuestion(product.id, newQuestion) as ProductQuestion;
      setQuestions((prev) => [q, ...prev]);
      setNewQuestion("");
      toast.success("Question submitted!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit question");
    } finally {
      setSubmittingQ(false);
    }
  }

  /* ---- Computed ---- */
  if (loading) return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 16 }}>
      Loading product...
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Product not found</div>
      <Link href="/store" style={linkBtn}>Back to Store</Link>
    </div>
  );

  const allImages = product.images?.length
    ? product.images.sort((a, b) => a.position - b.position).map((i) => i.image_url)
    : product.main_image
    ? [product.main_image]
    : [];

  const activeVariant = selectedVariant ?? null;
  const displayPrice = activeVariant?.price ?? product.price;
  const displayCompare = activeVariant?.compare_price ?? product.compare_price;
  const displayStock = activeVariant?.stock ?? product.stock;
  const inStock = activeVariant ? activeVariant.in_stock && activeVariant.stock > 0 : product.in_stock && product.stock > 0;
  const discount = displayCompare && displayCompare > displayPrice
    ? Math.round(((displayCompare - displayPrice) / displayCompare) * 100)
    : null;

  const ratingCount = product.rating_number ?? 0;
  const avgRating = product.rating ?? 0;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>

      {/* BREADCRUMB */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 0" }}>
        <div className="container">
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#64748b" }}>
            <Link href="/store" style={{ color: "#64748b", textDecoration: "none" }}>Store</Link>
            <span>›</span>
            {product.category && (
              <>
                <Link href={`/store/${product.category}`} style={{ color: "#64748b", textDecoration: "none" }}>{product.category}</Link>
                <span>›</span>
              </>
            )}
            <span style={{ color: "#0f172a", fontWeight: 600 }}>{product.title}</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "40px 16px 80px" }}>

        {/* ===== MAIN PRODUCT GRID ===== */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)", gap: 48, alignItems: "start" }}>

          {/* IMAGE GALLERY */}
          <div style={{ position: "sticky", top: 100 }}>
            {/* Main Image */}
            <div style={{ borderRadius: 20, overflow: "hidden", background: "#f1f5f9", border: "1px solid #e5e7eb", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              {allImages[activeImg] ? (
                <img
                  src={allImages[activeImg]}
                  alt={product.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ fontSize: 64, opacity: 0.2 }}>📦</div>
              )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    style={{
                      width: 64, height: 64, borderRadius: 10, overflow: "hidden", border: `2px solid ${i === activeImg ? "#0f172a" : "#e5e7eb"}`,
                      padding: 0, cursor: "pointer", background: "#f1f5f9", flexShrink: 0,
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* BUY BOX */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Brand + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {product.brand && (
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#64748b", textTransform: "uppercase" }}>
                  {product.brand}
                </span>
              )}
              {!inStock && (
                <span style={{ ...badge, background: "#fee2e2", color: "#991b1b" }}>Out of Stock</span>
              )}
              {discount && (
                <span style={{ ...badge, background: "#dc2626", color: "#fff" }}>-{discount}% OFF</span>
              )}
              {product.sales > 10 && (
                <span style={{ ...badge, background: "#fef3c7", color: "#92400e" }}>🔥 Bestseller</span>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.25, margin: 0, color: "#0f172a" }}>
              {product.title}
            </h1>

            {/* Rating summary */}
            {avgRating > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Stars rating={avgRating} size={18} />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{avgRating.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>({ratingCount.toLocaleString()} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: "#0f172a" }}>{formatCurrency(displayPrice)}</span>
              {displayCompare && displayCompare > displayPrice && (
                <span style={{ fontSize: 18, color: "#94a3b8", textDecoration: "line-through" }}>
                  {formatCurrency(displayCompare)}
                </span>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#475569", margin: 0 }}>
                {product.short_description}
              </p>
            )}

            {/* VARIANT SELECTOR */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                  Select Variant
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {product.variants.filter(v => v.is_active && !v.is_deleted).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: `2px solid ${selectedVariant?.id === v.id ? "#0f172a" : "#e5e7eb"}`,
                        background: selectedVariant?.id === v.id ? "#0f172a" : "#fff",
                        color: selectedVariant?.id === v.id ? "#fff" : "#0f172a",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: v.stock === 0 ? "not-allowed" : "pointer",
                        opacity: v.stock === 0 ? 0.4 : 1,
                      }}
                    >
                      {v.title}
                      {v.stock === 0 && " (OOS)"}
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                    SKU: {selectedVariant.sku ?? "N/A"} · Stock: {selectedVariant.stock}
                  </div>
                )}
              </div>
            )}

            {/* Stock indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: inStock ? "#16a34a" : "#dc2626", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: inStock ? "#166534" : "#991b1b" }}>
                {inStock ? `In Stock${displayStock <= 10 ? ` — Only ${displayStock} left!` : ""}` : "Out of Stock"}
              </span>
            </div>

            {/* Quantity + Add to Cart */}
            {inStock && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {/* Qty control */}
                <div style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#f8fafc" }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={qtyBtnStyle}>−</button>
                  <span style={{ minWidth: 44, textAlign: "center", fontWeight: 800, fontSize: 16 }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(displayStock, q + 1))} style={qtyBtnStyle}>+</button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  style={{ flex: 1, minWidth: 180, padding: "14px 20px", borderRadius: 14, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: addingToCart ? 0.7 : 1, transition: "opacity 0.15s" }}
                >
                  {addingToCart ? "Adding..." : "🛒 Add to Cart"}
                </button>
              </div>
            )}

            {/* Wishlist */}
            <button
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
              style={{ padding: "12px", borderRadius: 12, border: "1px solid #e5e7eb", background: wishlisted ? "#fff0f0" : "#f8fafc", color: wishlisted ? "#dc2626" : "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}
            >
              {wishlisted ? "♥ Remove from Wishlist" : "♡ Add to Wishlist"}
            </button>

            {/* Specs preview */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Specifications</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {Object.entries(product.specs).slice(0, 5).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>{k}</span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== TABS ===== */}
        <div style={{ marginTop: 56, background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {/* Tab nav */}
          <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
            {([
              { key: "description", label: "Description" },
              { key: "reviews", label: `Reviews${ratingCount > 0 ? ` (${ratingCount})` : ""}` },
              { key: "qa", label: `Q&A${questions.length > 0 ? ` (${questions.length})` : ""}` },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: "16px 28px",
                  border: "none",
                  background: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  color: activeTab === t.key ? "#0f172a" : "#64748b",
                  borderBottom: `3px solid ${activeTab === t.key ? "#0f172a" : "transparent"}`,
                  marginBottom: -1,
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 32 }}>

            {/* DESCRIPTION TAB */}
            {activeTab === "description" && (
              <div>
                {product.description ? (
                  <p style={{ fontSize: 15, lineHeight: 1.8, color: "#334155", whiteSpace: "pre-line" }}>{product.description}</p>
                ) : (
                  <p style={{ color: "#94a3b8" }}>No description available.</p>
                )}

                {product.features && Array.isArray(product.features) && product.features.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Key Features</div>
                    <ul style={{ paddingLeft: 20, display: "grid", gap: 8 }}>
                      {product.features.map((f: any, i: number) => (
                        <li key={i} style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{String(f)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {product.details && Object.keys(product.details).length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Product Details</div>
                    <div style={{ display: "grid", gap: 0, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                      {Object.entries(product.details).map(([k, v], i) => (
                        <div key={k} style={{ display: "flex", fontSize: 14, background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                          <div style={{ width: 200, padding: "12px 16px", fontWeight: 600, color: "#475569", flexShrink: 0 }}>{k}</div>
                          <div style={{ padding: "12px 16px", color: "#334155", flex: 1 }}>{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div>
                {/* Rating summary bar */}
                {avgRating > 0 && (
                  <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 32, padding: 24, background: "#f8fafc", borderRadius: 16, border: "1px solid #e5e7eb" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 52, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
                      <Stars rating={avgRating} size={20} />
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{ratingCount} reviews</div>
                    </div>
                  </div>
                )}

                {/* Write review button */}
                {!showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    style={{ ...greenBtnStyle, marginBottom: 24 }}
                  >
                    ✏️ Write a Review
                  </button>
                )}

                {/* Review form */}
                {showReviewForm && (
                  <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24, marginBottom: 32 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Your Review</div>

                    {/* Star picker */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>Rating</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                            onMouseEnter={() => setHoveredStar(n)}
                            onMouseLeave={() => setHoveredStar(0)}
                            style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", color: n <= (hoveredStar || reviewForm.rating) ? "#f59e0b" : "#d1d5db", transition: "color 0.1s" }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={labelSt}>Title</label>
                      <input
                        style={inputSt}
                        placeholder="Summarize your experience"
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={labelSt}>Review *</label>
                      <textarea
                        style={{ ...inputSt, height: 100, resize: "vertical" }}
                        placeholder="Tell others what you think about this product..."
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewForm.comment}
                        style={{ ...greenBtnStyle, opacity: submittingReview || !reviewForm.comment ? 0.6 : 1 }}
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                      <button onClick={() => setShowReviewForm(false)} style={ghostBtnStyle}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Reviews list */}
                {reviewsLoading ? (
                  <div style={{ color: "#64748b", textAlign: "center", padding: 32 }}>Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
                    <div style={{ fontWeight: 600 }}>No reviews yet. Be the first!</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    {reviews.map((r) => (
                      <div key={r.id} style={{ padding: 20, borderRadius: 14, border: "1px solid #e5e7eb", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user?.full_name ?? "Customer"}</div>
                            <Stars rating={r.rating} />
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            {new Date(r.created_at).toLocaleDateString()}
                            {r.verified_purchase && <span style={{ marginLeft: 8, color: "#166534", fontWeight: 600 }}>✓ Verified</span>}
                          </div>
                        </div>
                        {r.title && <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{r.title}</div>}
                        {r.comment && <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 12 }}>{r.comment}</div>}
                        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#94a3b8" }}>
                          <span>Helpful?</span>
                          <button onClick={() => handleVote(r.id, true)} style={{ ...tinyBtn, color: "#166534" }}>👍 {r.helpful_count}</button>
                          <button onClick={() => handleVote(r.id, false)} style={tinyBtn}>👎 {r.unhelpful_count}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Q&A TAB */}
            {activeTab === "qa" && (
              <div>
                {/* Ask question form */}
                <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24, marginBottom: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Ask a Question</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      style={{ ...inputSt, flex: 1 }}
                      placeholder="What would you like to know about this product?"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                    />
                    <button
                      onClick={handleAskQuestion}
                      disabled={submittingQ || !newQuestion.trim()}
                      style={{ ...greenBtnStyle, opacity: submittingQ || !newQuestion.trim() ? 0.6 : 1, flexShrink: 0 }}
                    >
                      {submittingQ ? "..." : "Ask"}
                    </button>
                  </div>
                </div>

                {/* Questions list */}
                {qaLoading ? (
                  <div style={{ color: "#64748b", textAlign: "center", padding: 32 }}>Loading questions...</div>
                ) : questions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                    <div style={{ fontWeight: 600 }}>No questions yet. Ask the first one!</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    {questions.map((q) => (
                      <div key={q.id} style={{ padding: 20, borderRadius: 14, border: "1px solid #e5e7eb", background: "#fff" }}>
                        <div style={{ display: "flex", gap: 10, marginBottom: q.answer ? 12 : 0 }}>
                          <span style={{ color: "#0f172a", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>Q:</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{q.question}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                              {q.user?.full_name ?? "Customer"} · {new Date(q.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {q.answer && (
                          <div style={{ display: "flex", gap: 10, background: "#f0fdf4", padding: "12px 14px", borderRadius: 10, marginTop: 8 }}>
                            <span style={{ color: "#166534", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>A:</span>
                            <div style={{ fontSize: 14, color: "#166534", lineHeight: 1.6 }}>{q.answer}</div>
                          </div>
                        )}
                        {!q.answer && (
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, fontStyle: "italic" }}>Awaiting answer...</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== RELATED PRODUCTS ===== */}
        {related.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 24, color: "#0f172a" }}>You May Also Like</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY BUY BAR */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", zIndex: 100, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>{product.title.slice(0, 30)}{product.title.length > 30 ? "..." : ""}</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{formatCurrency(displayPrice)}</div>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!inStock || addingToCart}
          style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: inStock ? "#0f172a" : "#94a3b8", color: "#fff", fontWeight: 800, fontSize: 14, cursor: inStock ? "pointer" : "not-allowed" }}
        >
          {inStock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */
const badge: React.CSSProperties = { padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 };
const qtyBtnStyle: React.CSSProperties = { padding: "10px 16px", background: "none", border: "none", fontWeight: 900, fontSize: 20, cursor: "pointer", color: "#0f172a" };
const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box", background: "#fff", outline: "none" };
const labelSt: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const greenBtnStyle: React.CSSProperties = { padding: "10px 20px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const ghostBtnStyle: React.CSSProperties = { padding: "10px 20px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#475569" };
const tinyBtn: React.CSSProperties = { background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 8px", fontSize: 12, cursor: "pointer" };
const linkBtn: React.CSSProperties = { padding: "10px 20px", borderRadius: 10, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 };