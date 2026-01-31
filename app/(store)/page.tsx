"use client";

import { useState } from "react";

import StoreToolbar, {
  Filters,
  SortMode,
} from "@/components/layout/store/StoreToolbar";
import StoreTabs from "@/components/store/StoreTabs";

export default function StoreHomePage() {
  const [filters, setFilters] = useState<Filters>(
    {} as Filters
  );
  const [sort, setSort] =
    useState<SortMode>("featured");

  return (
    <div className="space-y-6">
      {/* Store header / filters */}
      <StoreToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />

      {/* Category / store tabs */}
      <StoreTabs />

      {/* Product listing will live here */}
      <p className="text-gray-500">
        Select a category to browse products.
      </p>
    </div>
  );
}
