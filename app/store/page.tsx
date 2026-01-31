"use client";

import { useState } from "react";

import StoreToolbar from "@/components/layout/store/StoreToolbar";
import StoreTabs from "@/components/store/StoreTabs";

/* ======================================================
   STORE DOMAIN TYPES (AUTHORITATIVE)
====================================================== */

export type StoreFilters = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
};

export type StoreSort =
  | "featured"
  | "price_low"
  | "price_high"
  | "rating";

/* ======================================================
   STORE PAGE
====================================================== */

export default function StorePage() {
  const [filters, setFilters] = useState<StoreFilters>({
    q: "",
  });

  const [sort, setSort] = useState<StoreSort>("featured");

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

      {/* ===== PLACEHOLDER PRODUCT GRID ===== */}
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
