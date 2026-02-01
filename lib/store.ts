"use client";

import { create } from "zustand";
import type { ProductListItem } from "./types";
import { listProducts } from "./products";

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

      const data = await listProducts({
        ...filters,
        page,
        per_page,
      });

      set({
        products: reset ? data : [...products, ...data],
        loading: false,
      });
    } catch (err: any) {
      set({
        loading: false,
        error: "Failed to load products",
      });
    }
  },

  /* =========================
     FILTER & PAGINATION
  ========================== */

  setFilters: (newFilters) => {
    set({
      filters: { ...get().filters, ...newFilters },
      page: 1,
      products: [],
    });
  },

  setPage: (page) => {
    set({ page });
  },

  reset: () => {
    set({
      products: [],
      filters: {},
      page: 1,
      per_page: 20,
      loading: false,
      error: null,
    });
  },
}));
