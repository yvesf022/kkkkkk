/**
 * PRODUCTS API — AUTHORITATIVE (FIXED)
 *
 * Backend contract:
 * - Public listing: GET /api/products
 * - Admin create: POST /api/products
 * - Admin update status: POST /api/admin/products/{id}/status
 * - Images handled via multipart/form-data
 * - Auth via cookies only
 */

import { productsApi, adminApi } from "./api";
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
  return (await productsApi.list(params)) as ProductListItem[];
}

/* =====================================================
   ADMIN — PRODUCT CRUD
===================================================== */

// ✅ FIXED: Admin uses same GET endpoint
export async function getAdminProduct(
  productId: string,
): Promise<Product> {
  return (await productsApi.get(productId)) as Product;
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
  img?: string;
};

export async function createProduct(
  payload: CreateProductPayload,
): Promise<{ id: string; title: string }> {
  return (await productsApi.create(payload)) as {
    id: string;
    title: string;
  };
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

// ✅ FIXED: Use admin API
export async function disableProduct(
  productId: string,
): Promise<void> {
  await adminApi.updateProductStatus(productId, "inactive");
}

// ✅ FIXED: Use admin API
export async function restoreProduct(
  productId: string,
): Promise<void> {
  await adminApi.updateProductStatus(productId, "active");
}

/* =====================================================
   ADMIN — PRODUCT IMAGES
===================================================== */

export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<{ url: string; position: number }> {
  return (await productsApi.uploadImage(productId, file)) as {
    url: string;
    position: number;
  };
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
