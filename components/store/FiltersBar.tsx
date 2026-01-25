"use client";

import React from "react";
import type { Filters, SortMode } from "./StoreToolbar";

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
      {/* MIN */}
      <input
        placeholder="Min price"
        inputMode="numeric"
        value={filters.min ?? ""}
        onChange={(e) =>
          setFilters((f) => ({
            ...f,
            min: e.target.value
              ? Number(e.target.value)
              : undefined,
          }))
        }
        style={{
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.18)",
          fontWeight: 700,
          background: "linear-gradient(135deg,#ffffff,#f8fbff)",
          color: "#0f172a",
        }}
      />

      {/* MAX */}
      <input
        placeholder="Max price"
        inputMode="numeric"
        value={filters.max ?? ""}
        onChange={(e) =>
          setFilters((f) => ({
            ...f,
            max: e.target.value
              ? Number(e.target.value)
              : undefined,
          }))
        }
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
        onChange={(e) =>
          setSort(e.target.value as SortMode)
        }
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
