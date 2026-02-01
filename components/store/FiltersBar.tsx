"use client";

import React from "react";
import type { Filters, SortMode } from "./StoreToolbar";

const SORT_OPTIONS: SortMode[] = [
  "featured",
  "rating",
  "price_low",
  "price_high",
];

export default function FiltersBar({
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
      style={{
        display: "grid",
        gridTemplateColumns: "0.9fr 0.9fr 1fr",
        gap: 10,
      }}
      className="filtersGrid"
    >
      {/* MIN PRICE */}
      <input
        type="number"
        placeholder="Min price"
        value={filters.min ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const n = v === "" ? undefined : Number(v);

          setFilters((f) => ({
            ...f,
            min: Number.isFinite(n!) ? n : undefined,
          }));
        }}
        style={{
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.18)",
          fontWeight: 700,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          color: "#0f172a",
        }}
      />

      {/* MAX PRICE */}
      <input
        type="number"
        placeholder="Max price"
        value={filters.max ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const n = v === "" ? undefined : Number(v);

          setFilters((f) => ({
            ...f,
            max: Number.isFinite(n!) ? n : undefined,
          }));
        }}
        style={{
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.18)",
          fontWeight: 700,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          color: "#0f172a",
        }}
      />

      {/* SORT */}
      <select
        value={sort}
        onChange={(e) => {
          const value = e.target.value as SortMode;
          if (SORT_OPTIONS.includes(value)) {
            setSort(value);
          }
        }}
        style={{
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.18)",
          fontWeight: 800,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          color: "#0f172a",
        }}
      >
        <option value="featured">Featured</option>
        <option value="rating">Top Rated</option>
        <option value="price_low">Price ↑</option>
        <option value="price_high">Price ↓</option>
      </select>

      <style>{`
        @media (max-width: 900px) {
          .filtersGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
