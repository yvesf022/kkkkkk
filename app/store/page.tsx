"use client";

import { useState } from "react";

import StoreToolbar, {
  Filters,
  SortMode,
} from "@/components/layout/store/StoreToolbar";

export default function StorePage() {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    category: undefined,
    min: undefined,
    max: undefined,
  });

  const [sort, setSort] = useState<SortMode>("featured");

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        Store Toolbar Test
      </h1>

      <StoreToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
      />
    </div>
  );
}
