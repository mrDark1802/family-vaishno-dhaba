import { adminFetch, ApiResponse } from "./api";
import { Banner, CreateBannerDto, UpdateBannerDto, UiSettings } from "@repo/types";

export async function fetchAdminBannersApi(
  includeInactive = true,
): Promise<ApiResponse<Banner[]>> {
  return adminFetch(`/banners?includeInactive=${includeInactive}`);
}

export async function fetchUiSettingsApi(): Promise<ApiResponse<UiSettings>> {
  return adminFetch("/banners/ui-settings");
}

export async function createBannerApi(
  dto: CreateBannerDto,
): Promise<ApiResponse<Banner>> {
  return adminFetch("/banners", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateBannerApi(
  id: string,
  dto: UpdateBannerDto,
): Promise<ApiResponse<Banner>> {
  return adminFetch(`/banners/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function toggleBannerApi(
  id: string,
): Promise<ApiResponse<Banner>> {
  return adminFetch(`/banners/${id}/toggle`, {
    method: "PATCH",
  });
}

export async function deleteBannerApi(
  id: string,
): Promise<ApiResponse<{ success: boolean }>> {
  return adminFetch(`/banners/${id}`, {
    method: "DELETE",
  });
}
