"use client";

import React from "react";
import type { Filters } from "./StoreToolbar";

export default function SearchBar({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  return (
    <input
      placeholder="Search products"
      value={filters.q ?? ""}
      onChange={(e) =>
        setFilters((f) => ({
          ...f,
          q: e.target.value,
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
  );
}
