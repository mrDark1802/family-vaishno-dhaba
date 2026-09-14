import { adminFetch, ApiResponse } from "./api";
import {
  CouponSummary,
  CreateCouponDto,
  UpdateCouponDto,
} from "@repo/types";

export async function fetchAdminCouponsApi(
  includeInactive = true,
): Promise<ApiResponse<CouponSummary[]>> {
  return adminFetch(`/coupons?includeInactive=${includeInactive}`);
}

export async function createCouponApi(
  dto: CreateCouponDto,
): Promise<ApiResponse<CouponSummary>> {
  return adminFetch("/coupons", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateCouponApi(
  id: string,
  dto: UpdateCouponDto,
): Promise<ApiResponse<CouponSummary>> {
  return adminFetch(`/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function toggleCouponApi(
  id: string,
): Promise<ApiResponse<CouponSummary>> {
  return adminFetch(`/coupons/${id}/toggle`, {
    method: "PATCH",
  });
}

export async function deleteCouponApi(
  id: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return adminFetch(`/coupons/${id}`, {
    method: "DELETE",
  });
}
