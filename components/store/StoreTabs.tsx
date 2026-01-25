"use client";

import React from "react";
import type { Filters } from "./StoreToolbar";

const CATEGORIES = ["all", "beauty", "fashion", "mobile"];

export default function StoreTabs({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      {CATEGORIES.map((c) => {
        const active = (filters.category ?? "all") === c;

        return (
          <button
            key={c}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                category: c === "all" ? undefined : c,
              }))
            }
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(15,23,42,0.18)",
              background: active
                ? "linear-gradient(135deg,#dbeafe,#eff6ff)"
                : "#ffffff",
              fontWeight: 800,
              color: "#0f172a",
              cursor: "pointer",
              boxShadow: active
                ? "0 8px 24px rgba(96,165,250,0.25)"
                : "0 4px 12px rgba(15,23,42,0.08)",
            }}
          >
            {c.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
