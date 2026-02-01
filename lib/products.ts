/**
 * PRODUCTS API — AUTHORITATIVE
 *
 * Backend contract:
 * - Public listing: GET /api/products
 * - Admin create: POST /api/products
 * - Admin update: PATCH /api/products/admin/{id}
 * - Images handled via multipart/form-data
 * - Auth via cookies only (credentials included globally)
 */

import { productsApi } from "./api";
import type {
  Product,
  ProductListItem,
  ProductStatus,
} from "./types";

/* =====================================================
   PUBLIC STORE
===================================================== */

export type ProductListParams = {
  search_query?: string;
  category?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  min_rating?: number;
  sort?: "price_low" | "price_high" | "rating" | "best_sellers";
  page?: number;
  per_page?: number;
};

export async function listProducts(
  params: ProductListParams = {},
): Promise<ProductListItem[]> {
  return (await productsApi.list(
    params,
  )) as ProductListItem[];
}

/* =====================================================
   ADMIN — PRODUCT CRUD
===================================================== */

export async function getAdminProduct(
  productId: string,
): Promise<Product> {
  return (await productsApi.getAdmin(
    productId,
  )) as Product;
}

export type CreateProductPayload = {
  title: string;
  price: number;
  short_description?: string;
  description?: string;
  sku?: string;
