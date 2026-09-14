import { adminFetch, ApiResponse } from "./api";
import { CustomerProfile, UserRole } from "@repo/types";

export interface AdminLoginDto {
  identifier: string;
  password: string;
}

export async function loginAdminApi(
  dto: AdminLoginDto,
): Promise<ApiResponse<{ user: CustomerProfile; requiresTwoFactor?: boolean }>> {
  return adminFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function fetchAdminProfileApi(): Promise<ApiResponse<CustomerProfile>> {
  return adminFetch("/auth/me", {
    method: "GET",
  });
}

export async function logoutAdminApi(): Promise<ApiResponse<{ message: string }>> {
  return adminFetch("/auth/logout", {
    method: "POST",
  });
}
