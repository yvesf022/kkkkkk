"use client";

import React from "react";

export type SortMode =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc";

export type Filters = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
};

const SORT_OPTIONS: SortMode[] = [
  "featured",
  "newest",
  "price_asc",
  "price_desc",
];

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
    <section
      style={{
        position: "relative",
        borderRadius: 26,
        padding: 18,
        background: `
          radial-gradient(
            800px 260px at 12% 10%,
            rgba(96,165,250,0.18),
            transparent 60%
          ),
          radial-gradient(
            800px 260px at 88% 14%,
            rgba(244,114,182,0.14),
            transparent 60%
          ),
          linear-gradient(135deg,#ffffff,#f8fbff)
        `,
        boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 15,
              color: "#0f172a",
            }}
          >
            Shop Products
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(15,23,42,0.6)",
            }}
          >
            Search, filter, and sort items
          </div>
        </div>

        <button
          className="btn btnGhost"
          onClick={() => {
            setFilters({});
            setSort("featured");
          }}
        >
          Reset
        </button>
      </div>

      {/* CONTROLS */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.9fr 0.9fr 1fr",
          gap: 10,
        }}
        className="storeToolbarGrid"
      >
        {/* SEARCH */}
        <input
          placeholder="Search products"
          value={filters.q ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            setFilters((s) => ({
              ...s,
              q: v.length > 0 ? v : undefined,
            }));
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.12)",
            fontWeight: 700,
            background:
              "linear-gradient(135deg,#ffffff,#f8fbff)",
          }}
        />

        {/* MIN */}
        <input
          type="number"
          placeholder="Min M"
          value={filters.min ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            const n = v === "" ? undefined : Number(v);

            setFilters((s) => ({
              ...s,
              min: Number.isFinite(n!) ? n : undefined,
            }));
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.12)",
            fontWeight: 700,
            background:
              "linear-gradient(135deg,#ffffff,#f8fbff)",
          }}
        />

        {/* MAX */}
        <input
          type="number"
          placeholder="Max M"
          value={filters.max ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            const n = v === "" ? undefined : Number(v);

            setFilters((s) => ({
              ...s,
              max: Number.isFinite(n!) ? n : undefined,
            }));
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.12)",
            fontWeight: 700,
            background:
              "linear-gradient(135deg,#ffffff,#f8fbff)",
          }}
        />

        {/* SORT */}
        <select
          value={sort}
          onChange={(e) => {
            const v = e.target.value as SortMode;
            if (SORT_OPTIONS.includes(v)) {
              setSort(v);
            }
          }}
          style={{
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.12)",
            fontWeight: 800,
            background:
              "linear-gradient(135deg,#ffffff,#f8fbff)",
          }}
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price_asc">
            Price: Low → High
          </option>
          <option value="price_desc">
            Price: High → Low
          </option>
        </select>
      </div>

      {/* RESPONSIVE */}
      <style>{`
        @media (max-width: 980px) {
          .storeToolbarGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
