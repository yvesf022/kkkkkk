"use client";

import { create } from "zustand";
import type { ProductListItem } from "./types";
import { productsApi } from "./api";

/**
 * BACKEND CONTRACT (DO NOT CHANGE):
 *
 * - Backend does NOT store UI state
 * - Backend does NOT remember filters
 * - Backend does NOT paginate beyond query params
 *
 * Store state = FRONTEND ONLY
 */

export type StoreFilters = {
  search_query?: string;
  category?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  min_rating?: number;
  sort?: "price_low" | "price_high" | "rating" | "best_sellers";
};

type StoreState = {
  products: ProductListItem[];
  total: number;
  loading: boolean;
  error: string | null;

  filters: StoreFilters;
  page: number;
  per_page: number;

  fetchProducts: (reset?: boolean) => Promise<void>;
  setFilters: (filters: Partial<StoreFilters>) => void;
  setPage: (page: number) => void;
  reset: () => void;
};

export const useStore = create<StoreState>((set, get) => ({
  products: [],
  total: 0,
  loading: false,
  error: null,

  filters: {},
  page: 1,
  per_page: 20,

  /* =========================
     DATA FETCHING
  ========================== */

  fetchProducts: async (reset = false) => {
    set({ loading: true, error: null });

    try {
      const { filters, page, per_page, products } = get();

      // Build API params — strip undefined/null values
      const params: Record<string, any> = { page, per_page };

      if (filters.search_query)      params.q          = filters.search_query;
      if (filters.category)          params.category   = filters.category;
      if (filters.brand)             params.brand      = filters.brand;
      if (filters.min_price != null) params.min_price  = filters.min_price;
      if (filters.max_price != null) params.max_price  = filters.max_price;
      if (filters.in_stock)          params.in_stock   = true;
      if (filters.min_rating != null) params.min_rating = filters.min_rating;

      // Map sort enum → API sort_by / sort_order params
      if (filters.sort) {
        const sortMap: Record<string, { sort_by: string; sort_order: string }> = {
          price_low:    { sort_by: "price",  sort_order: "asc"  },
          price_high:   { sort_by: "price",  sort_order: "desc" },
          rating:       { sort_by: "rating", sort_order: "desc" },
          best_sellers: { sort_by: "sales",  sort_order: "desc" },
        };
        const mapped = sortMap[filters.sort];
        if (mapped) Object.assign(params, mapped);
      }

      // productsApi.list returns { total: number; results: ProductListItem[] }
      const res = await productsApi.list(params);
      const incoming: ProductListItem[] = res?.results ?? [];
      const total: number               = res?.total   ?? incoming.length;

      set({
        products: reset ? incoming : [...products, ...incoming],
        total,
        loading: false,
      });
    } catch {
      set({ loading: false, error: "Failed to load products" });
    }
  },

  /* =========================
     FILTER & PAGINATION
  ========================== */

  setFilters: (newFilters) => {
    set({
      filters:  { ...get().filters, ...newFilters },
      page:     1,
      products: [],
      total:    0,
    });
  },

  setPage: (page) => set({ page }),

  reset: () =>
    set({
      products: [],
      total:    0,
      filters:  {},
      page:     1,
      per_page: 20,
      loading:  false,
      error:    null,
    }),
}));