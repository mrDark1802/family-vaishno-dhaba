import { adminFetch, ApiResponse } from "./api";
import {
  CategorySummary,
  ProductSummary,
  CreateProductDto,
  UpdateProductDto,
} from "@repo/types";

export async function fetchAdminCategoriesApi(): Promise<ApiResponse<CategorySummary[]>> {
  return adminFetch("/menu/categories");
}

export async function fetchAdminMenuApi(params?: {
  category?: string;
  search?: string;
}): Promise<ApiResponse<ProductSummary[]>> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  return adminFetch(`/menu${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminDishByIdApi(id: string): Promise<ApiResponse<ProductSummary>> {
  return adminFetch(`/menu/${id}`);
}

export async function createDishApi(
  dto: CreateProductDto,
): Promise<ApiResponse<ProductSummary>> {
  return adminFetch("/menu", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateDishApi(
  id: string,
  dto: UpdateProductDto,
): Promise<ApiResponse<ProductSummary>> {
  return adminFetch(`/menu/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function toggleDishAvailabilityApi(
  id: string,
): Promise<ApiResponse<ProductSummary>> {
  return adminFetch(`/menu/${id}/toggle-availability`, {
    method: "PATCH",
  });
}

export async function deleteDishApi(
  id: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return adminFetch(`/menu/${id}`, {
    method: "DELETE",
  });
}

export async function createCategoryApi(
  dto: any,
): Promise<ApiResponse<CategorySummary>> {
  return adminFetch("/menu/categories", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function deleteCategoryApi(
  id: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return adminFetch(`/menu/categories/${id}`, {
    method: "DELETE",
  });
}

