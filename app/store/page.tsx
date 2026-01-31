"use client";

import { useState } from "react";

import StoreToolbar, {
  Filters,
  SortMode,
} from "@/components/store/StoreToolbar";
import StoreTabs from "@/components/store/StoreTabs";

export default function StorePage() {
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortMode>("featured");

  return (
    <div className="space-y-6">
      {/* ===== STORE HEADER / FILTERS ===== */}
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

      {/* ===== PLACEHOLDER PRODUCT AREA ===== */}
      <p className="text-gray-500">
        Select a category to browse products.
      </p>
    </div>
  );
}
