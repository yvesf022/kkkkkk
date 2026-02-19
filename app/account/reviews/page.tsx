"use client";

/**
 * FIX: handleVote() was passing `helpful: boolean` directly to reviewsApi.vote()
 * which now expects "up" | "down". Fixed: helpful ? "up" : "down"
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { reviewsApi } from "@/lib/api";
import type { Review } from "@/lib/types";

const FF = "'DM Sans', -apple-system, sans-serif";
const FM = "'DM Mono', 'Fira Mono', monospace";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 16 16" fill={n <= rating ? "#f59e0b" : "#e2e8f0"}>
          <path d="M8 1l1.854 3.756 4.146.602-3 2.924.708 4.128L8 10.25l-3.708 1.16.708-4.128-3-2.924 4.146-.602z"/>
        </svg>
      ))}
    </span>
  );
}

function StarPicker({ value, hovered, onChange, onHover, onLeave }: {
  value: number; hovered: number;
  onChange: (n: number) => void;
  onHover: (n: number) => void;
  onLeave: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => onHover(n)}
          onMouseLeave={onLeave}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, transition: "transform .1s" }}
        >
          <svg width="26" height="26" viewBox="0 0 16 16"
            fill={n <= (hovered || value) ? "#f59e0b" : "#e2e8f0"}
            style={{ transition: "fill .1s", transform: n <= (hovered || value) ? "scale(1.15)" : "scale(1)" }}
          >
            <path d="M8 1l1.854 3.756 4.146.602-3 2.924.708 4.128L8 10.25l-3.708 1.16.708-4.128-3-2.924 4.146-.602z"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState<Review | null>(null);
  const [editForm,   setEditForm]   = useState({ rating: 5, title: "", comment: "" });
  const [hoveredStar,setHoveredStar]= useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [votingId,   setVotingId]   = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    try {
      const data = await reviewsApi.getMy() as any;
      setReviews(Array.isArray(data) ? data : data?.reviews ?? []);
    } catch { setReviews([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function flash(text: string, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  }

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
      flash("Review updated successfully");
    } catch (e: any) {
      flash(e?.message ?? "Failed to update", false);
    } finally { setSavingEdit(false); }
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
    } finally { setDeletingId(null); }
  }

  // FIX: was `reviewsApi.vote(reviewId, helpful)` passing boolean
  // now correctly passes "up" | "down" per ReviewVotePayload schema
  async function handleVote(reviewId: string, helpful: boolean) {
    setVotingId(reviewId + (helpful ? "_up" : "_dn"));
    try {
      await reviewsApi.vote(reviewId, helpful ? "up" : "down");
      flash(helpful ? "Marked as helpful ↑" : "Feedback recorded ↓");
      load();
    } catch {
      flash("Could not record vote", false);
    } finally { setVotingId(null); }
  }

  const ratingLabel = (r: number) => ["", "Poor", "Fair", "Good", "Great", "Excellent"][r] ?? "";

  if (loading) return (
    <div style={{ fontFamily: FF }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ height: 140, borderRadius: 16, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite", marginBottom: 14 }} />
      ))}
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 740, fontFamily: FF }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none} }
        @keyframes toastIn { from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none} }
        .rev-card { animation: fadeUp .25s ease both; }
        .rev-card:hover { border-color: #cbd5e1 !important; box-shadow: 0 4px 20px rgba(0,0,0,.06) !important; }
        .vote-btn:hover { background: #f1f5f9 !important; border-color: #94a3b8 !important; }
        .action-btn:hover { background: #f8fafc !important; }
        .del-btn:hover { background: #fff1f2 !important; border-color: #fca5a5 !important; color: #dc2626 !important; }
        .save-btn:hover:not(:disabled) { background: #1e293b !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.ok ? "#0f172a" : "#dc2626", color: "#fff",
          boxShadow: "0 8px 30px rgba(0,0,0,.2)", animation: "toastIn .2s ease",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>{toast.ok ? "✓" : "!"}</span>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 6px" }}>
          My Reviews
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
          {reviews.length > 0
            ? `${reviews.length} review${reviews.length !== 1 ? "s" : ""} written`
            : "Share your experience with products you've purchased"}
        </p>
      </div>

      {/* Empty state */}
      {reviews.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 24px",
          background: "#fff", borderRadius: 20,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,.04)",
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>★</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a", marginBottom: 8 }}>No reviews yet</div>
          <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 300, margin: "0 auto 24px" }}>
            Purchase a product and share your honest experience to help other shoppers.
          </p>
          <Link href="/store" style={{
            display: "inline-flex", padding: "10px 22px", borderRadius: 10,
            background: "#0f172a", color: "#fff", textDecoration: "none",
            fontWeight: 600, fontSize: 14, fontFamily: FF,
          }}>
            Browse Products →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {reviews.map((r, idx) => (
            <div
              key={r.id}
              className="rev-card"
              style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 18, padding: 24,
                boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                transition: "border-color .15s, box-shadow .15s",
                animationDelay: `${idx * 40}ms`,
              }}
            >
              {editing?.id === r.id ? (
                /* ──── EDIT MODE ──── */
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Editing Review</span>
                    <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>

                  <div>
                    <label style={LS}>Rating</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                      <StarPicker
                        value={editForm.rating} hovered={hoveredStar}
                        onChange={(n) => setEditForm(f => ({ ...f, rating: n }))}
                        onHover={setHoveredStar} onLeave={() => setHoveredStar(0)}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>
                        {ratingLabel(hoveredStar || editForm.rating)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={LS}>Title</label>
                    <input
                      style={IS}
                      value={editForm.title}
                      placeholder="Summarize your experience"
                      onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={LS}>Review</label>
                    <textarea
                      style={{ ...IS, height: 100, resize: "vertical" }}
                      value={editForm.comment}
                      placeholder="What did you like or dislike?"
                      onChange={(e) => setEditForm(f => ({ ...f, comment: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={saveEdit}
                      disabled={savingEdit || !editForm.comment.trim()}
                      className="save-btn"
                      style={{
                        padding: "10px 20px", borderRadius: 10, border: "none",
                        background: "#0f172a", color: "#fff", fontWeight: 600,
                        fontSize: 13, cursor: "pointer", fontFamily: FF,
                        opacity: savingEdit || !editForm.comment.trim() ? 0.55 : 1,
                        transition: "background .15s",
                      }}
                    >
                      {savingEdit ? "Saving…" : "Save Changes"}
                    </button>
                    <button onClick={() => setEditing(null)} style={OB}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* ──── VIEW MODE ──── */
                <>
                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(r as any).product_title ?? "Product Review"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <Stars rating={r.rating} size={14} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{ratingLabel(r.rating)}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>· {r.rating}/5</span>
                        {r.verified_purchase && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                            background: "#dcfce7", color: "#16a34a", letterSpacing: 0.3,
                          }}>
                            ✓ VERIFIED
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0, paddingTop: 2 }}>
                      {new Date(r.created_at).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>

                  {/* Content */}
                  {r.title && (
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 6 }}>{r.title}</div>
                  )}
                  {r.comment && (
                    <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75, margin: "0 0 16px" }}>{r.comment}</p>
                  )}

                  {/* Divider */}
                  <div style={{ height: 1, background: "#f1f5f9", margin: "0 0 14px" }} />

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "#94a3b8", marginRight: 2 }}>Helpful?</span>
                      <button
                        className="vote-btn"
                        onClick={() => handleVote(r.id, true)}
                        disabled={votingId === r.id + "_up"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 10px", borderRadius: 8,
                          border: "1px solid #e2e8f0", background: "#f8fafc",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          color: "#475569", fontFamily: FF, transition: "all .15s",
                        }}
                      >
                        <span>👍</span> {r.helpful_count}
                      </button>
                      <button
                        className="vote-btn"
                        onClick={() => handleVote(r.id, false)}
                        disabled={votingId === r.id + "_dn"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 10px", borderRadius: 8,
                          border: "1px solid #e2e8f0", background: "#f8fafc",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          color: "#475569", fontFamily: FF, transition: "all .15s",
                        }}
                      >
                        <span>👎</span> {r.unhelpful_count}
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => startEdit(r)}
                        className="action-btn"
                        style={OB}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteReview(r.id)}
                        disabled={deletingId === r.id}
                        className="del-btn"
                        style={{
                          ...OB,
                          opacity: deletingId === r.id ? 0.6 : 1,
                          transition: "all .15s",
                        }}
                      >
                        {deletingId === r.id ? "Deleting…" : "Delete"}
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

const IS: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid #e2e8f0", fontSize: 14, fontFamily: "'DM Sans', sans-serif",
  boxSizing: "border-box", outline: "none", color: "#0f172a",
  background: "#fafafa", transition: "border-color .15s",
};
const LS: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em",
};
const OB: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
  background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer",
  color: "#475569", fontFamily: "'DM Sans', sans-serif", transition: "all .15s",
};