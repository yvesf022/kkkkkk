"use client";

import React from "react";

export type SortMode = "featured" | "price_low" | "price_high" | "rating";

export type Filters = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
};

export default function StoreToolbar({
  filters,
  setFilters,
  sort,
  setSort,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  sort: SortMode;
  setSort: React.Dispatch<React.SetStateAction<SortMode>>;
}) {
  return (
    <div
      className="glass"
      style={{
        padding: 14,
        display: "grid",
        gap: 12,
        borderRadius: 26,
        border: "1px solid rgba(18,8,18,0.14)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* soft pink decor */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(900px 260px at 10% 10%, rgba(255, 34, 140, 0.14), transparent 60%)",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          position: "relative",
        }}
      >
        <div style={{ display: "grid", gap: 3 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.2 }}>
            Shop Products
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(18,8,18,0.60)" }}>
            Search, filter, and sort items
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => {
              setFilters({});
              setSort("featured");
            }}
            style={{
              borderColor: "rgba(255, 34, 140, 0.20)",
              background:
                "linear-gradient(180deg, rgba(255,210,236,0.70), rgba(255,255,255,0.96))",
            }}
          >
            Reset ✨
          </button>
        </div>
      </div>

      {/* Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.9fr 0.9fr 1fr",
          gap: 10,
          position: "relative",
        }}
      >
        {/* Search */}
        <div className="pill" style={{ padding: "10px 14px" }}>
          <input
            placeholder="Search products…"
            value={filters.q ?? ""}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
            style={{ fontWeight: 900 }}
          />
        </div>

        {/* Min */}
        <div className="pill" style={{ padding: "10px 14px" }}>
          <input
            placeholder="Min M"
            inputMode="numeric"
            value={filters.min ?? ""}
            onChange={(e) =>
              setFilters((s) => ({
                ...s,
                min: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            style={{ fontWeight: 900 }}
          />
        </div>

        {/* Max */}
        <div className="pill" style={{ padding: "10px 14px" }}>
          <input
            placeholder="Max M"
            inputMode="numeric"
            value={filters.max ?? ""}
            onChange={(e) =>
              setFilters((s) => ({
                ...s,
                max: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            style={{ fontWeight: 900 }}
          />
        </div>

        {/* Sort */}
        <div className="pill" style={{ padding: "10px 14px" }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            style={{ fontWeight: 900 }}
          >
            <option value="featured">Featured</option>
            <option value="rating">Top Rated</option>
            <option value="price_low">Price: Low → High</option>
            <option value="price_high">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Mobile */}
      <style>{`
        @media (max-width: 980px){
          div[style*="grid-template-columns: 1.2fr 0.9fr 0.9fr 1fr"]{
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
