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
  return productsApi.list(params);
}

/* =====================================================
   ADMIN — PRODUCT CRUD
===================================================== */

export async function getAdminProduct(
  productId: string,
): Promise<Product> {
  return productsApi.getAdmin(productId);
}

export type CreateProductPayload = {
  title: string;
  price: number;
  short_description?: string;
  description?: string;
  sku?: string;
  brand?: string;
  compare_price?: number;
  category?: string;
  stock?: number;
  rating?: number;
  img?: string; // main_image (optional)
};

export async function createProduct(
  payload: CreateProductPayload,
): Promise<{ id: string; title: string }> {
  return productsApi.create(payload);
}

export type UpdateProductPayload = Partial<{
  title: string;
  short_description: string;
  description: string;
  sku: string;
  brand: string;
  price: number;
  compare_price: number;
  category: string;
  stock: number;
  rating: number;
  in_stock: boolean;
  status: ProductStatus;
  main_image: string;
  specs: Record<string, any>;
}>;

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
): Promise<void> {
  await productsApi.update(productId, payload);
}

export async function disableProduct(
  productId: string,
): Promise<void> {
  await productsApi.disable(productId);
}

export async function restoreProduct(
  productId: string,
): Promise<void> {
  await productsApi.restore(productId);
}

/* =====================================================
   ADMIN — PRODUCT IMAGES
===================================================== */

export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<{
  url: string;
  position: number;
}> {
  return productsApi.uploadImage(productId, file);
}

export async function deleteProductImage(
  imageId: string,
): Promise<void> {
  await productsApi.deleteImage(imageId);
}

export async function reorderProductImages(
  productId: string,
  imageIds: string[],
): Promise<void> {
  await productsApi.reorderImages(productId, imageIds);
}

export async function setMainProductImage(
  imageId: string,
): Promise<void> {
  await productsApi.setMainImage(imageId);
}
