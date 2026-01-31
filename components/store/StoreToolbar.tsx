"use client";

import React, { useCallback } from "react";

export type SortMode =
  | "featured"
  | "price_low"
  | "price_high"
  | "rating";

export type Filters = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
};

type Props = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  sort: SortMode;
  setSort: React.Dispatch<React.SetStateAction<SortMode>>;
};

export default function StoreToolbar({
  filters,
  setFilters,
  sort,
  setSort,
}: Props) {
  /* =========================
     STABLE UPDATERS (AMAZON STYLE)
  ========================= */

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value || undefined,
      }));
    },
    [setFilters]
  );

  const resetAll = () => {
    setFilters({});
    setSort("featured");
  };

  /* =========================
     UI
  ========================= */

  return (
    <section
      style={{
        borderRadius: 24,
        padding: 20,
        background: "#ffffff",
        boxShadow: "0 12px 40px rgba(15,23,42,0.12)",
        display: "grid",
        gap: 16,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            Shop Products
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Search, filter, and sort items
          </div>
        </div>

        <button
          className="btn btnGhost"
          onClick={resetAll}
        >
          Reset filters
        </button>
      </div>

      {/* FILTER GRID */}
      <div
        className="storeToolbarGrid"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 12,
        }}
      >
        {/* SEARCH */}
        <input
          placeholder="Search products"
          value={filters.q ?? ""}
          onChange={(e) =>
            updateFilter("q", e.target.value)
          }
          style={inputStyle}
        />

        {/* MIN PRICE */}
        <input
          placeholder="Min price (M)"
          inputMode="numeric"
          value={filters.min ?? ""}
          onChange={(e) =>
            updateFilter(
              "min",
              e.target.value
                ? Number(e.target.value)
                : undefined
            )
          }
          style={inputStyle}
        />

        {/* MAX PRICE */}
        <input
          placeholder="Max price (M)"
          inputMode="numeric"
          value={filters.max ?? ""}
          onChange={(e) =>
            updateFilter(
              "max",
              e.target.value
                ? Number(e.target.value)
                : undefined
            )
          }
          style={inputStyle}
        />

        {/* SORT */}
        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as SortMode)
          }
          style={inputStyle}
        >
          <option value="featured">Featured</option>
          <option value="rating">Top rated</option>
          <option value="price_low">
            Price: Low → High
          </option>
          <option value="price_high">
            Price: High → Low
          </option>
        </select>
      </div>

      {/* RESPONSIVE */}
      <style>{`
        @media (max-width: 900px) {
          .storeToolbarGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

/* =========================
   SHARED INPUT STYLE
========================= */

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15,23,42,0.15)",
  fontWeight: 700,
  background: "#f8fafc",
};
