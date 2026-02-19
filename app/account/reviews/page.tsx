"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { reviewsApi } from "@/lib/api";
import type { Review } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#f59e0b", fontSize: 15, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ opacity: n <= rating ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Review | null>(null);
  const [editForm, setEditForm] = useState({ rating: 5, title: "", comment: "" });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try {
      const data = await reviewsApi.getMy() as any;
      setReviews(data ?? []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); }

  function startEdit(r: Review) {
    setEditing(r);
    setEditForm({ rating: r.rating, title: r.title ?? "", comment: r.comment ?? "" });
    setHoveredStar(0);
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await reviewsApi.update(editing.id, editForm);
      setEditing(null);
      load();
      flash("Review updated!");
    } catch (e: any) {
      flash(e?.message ?? "Failed to update", false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await reviewsApi.delete(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      flash("Review deleted");
    } catch (e: any) {
      flash(e?.message ?? "Failed to delete", false);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleVote(reviewId: string, helpful: boolean) {
    try {
      await reviewsApi.vote(reviewId, helpful);
      flash(helpful ? "Marked as helpful" : "Feedback recorded");
    } catch {}
  }

  if (loading) return <div style={{ color: "#64748b" }}>Loading reviews...</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>My Reviews</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          {reviews.length > 0 ? `${reviews.length} review${reviews.length > 1 ? "s" : ""}` : "Reviews you've written for products"}
        </p>
      </div>

      {msg && (
        <div style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid", fontSize: 14, marginBottom: 16, background: msg.ok ? "#f0fdf4" : "#fef2f2", borderColor: msg.ok ? "#bbf7d0" : "#fecaca", color: msg.ok ? "#166534" : "#991b1b" }}>
          {msg.text}
        </div>
      )}

      {reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>No reviews yet</div>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
            Share your experience with products you've purchased.
          </p>
          <Link href="/store" style={{ padding: "10px 20px", borderRadius: 10, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
            Shop Now
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, position: "relative" }}
            >
              {editing?.id === r.id ? (
                /* ---- EDIT MODE ---- */
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Edit Review</div>

                  {/* Star picker */}
                  <div>
                    <label style={labelSt}>Rating</label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setEditForm(f => ({ ...f, rating: n }))}
                          onMouseEnter={() => setHoveredStar(n)}
                          onMouseLeave={() => setHoveredStar(0)}
                          style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", color: n <= (hoveredStar || editForm.rating) ? "#f59e0b" : "#d1d5db", transition: "color 0.1s" }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={labelSt}>Title</label>
                    <input style={inputSt} value={editForm.title} placeholder="Review title" onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
                  </div>

                  <div>
                    <label style={labelSt}>Comment</label>
                    <textarea
                      style={{ ...inputSt, height: 96, resize: "vertical" }}
                      value={editForm.comment}
                      placeholder="Your experience..."
                      onChange={(e) => setEditForm(f => ({ ...f, comment: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={saveEdit} disabled={savingEdit || !editForm.comment} style={{ ...primaryBtn, opacity: savingEdit || !editForm.comment ? 0.6 : 1 }}>
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setEditing(null)} style={outlineBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* ---- VIEW MODE ---- */
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>
                        {(r as any).product_title ?? "Product"}
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Stars rating={r.rating} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.rating}/5</span>
                        {r.verified_purchase && (
                          <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                            ✓ Verified Purchase
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {new Date(r.created_at).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>

                  {r.title && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#0f172a" }}>{r.title}</div>}
                  {r.comment && <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 14px" }}>{r.comment}</p>}

                  {/* Helpfulness */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#94a3b8" }}>
                      <span>Was this helpful?</span>
                      <button onClick={() => handleVote(r.id, true)} style={voteBtn}>👍 {r.helpful_count}</button>
                      <button onClick={() => handleVote(r.id, false)} style={voteBtn}>👎 {r.unhelpful_count}</button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEdit(r)} style={outlineBtn}>Edit</button>
                      <button
                        onClick={() => deleteReview(r.id)}
                        disabled={deletingId === r.id}
                        style={{ ...outlineBtn, color: "#dc2626", borderColor: "#fca5a5", opacity: deletingId === r.id ? 0.6 : 1 }}
                      >
                        {deletingId === r.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputSt: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box", outline: "none" };
const labelSt: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const primaryBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const outlineBtn: React.CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#475569" };
const voteBtn: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 8px", fontSize: 12, cursor: "pointer" };