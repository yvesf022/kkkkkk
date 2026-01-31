"use client";

import { useState } from "react";

import StoreToolbar, {
  Filters,
  SortMode,
} from "@/components/layout/store/StoreToolbar";
import StoreTabs from "@/components/store/StoreTabs";

export default function StorePage() {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    category: undefined,
    min: undefined,
    max: undefined,
  });

  const [sort, setSort] = useState<SortMode>("featured");

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* ===== HEADER / FILTERS ===== */}
      <StoreToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />

      {/* ===== CATEGORY TABS ===== */}
      <StoreTabs
        filters={filters}
        setFilters={setFilters}
      />

      {/* ===== PRODUCT PLACEHOLDER ===== */}
      <div
        style={{
          padding: 40,
          borderRadius: 24,
          background: "#f8fafc",
          textAlign: "center",
          fontWeight: 700,
          opacity: 0.6,
        }}
      >
        Products will appear here
      </div>
    </div>
  );
}
