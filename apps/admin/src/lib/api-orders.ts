import { adminFetch, ApiResponse } from "./api";
import { OrderResponse, OrderStatus } from "@repo/types";

export interface AdminStatsResponse {
  todayRevenue: number;
  todayOrders: number;
  activeKitchenOrders: number;
  completedOrders: number;
  averageOrderValue: number;
}

export interface AdminOrdersListResponse {
  orders: OrderResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchAdminOrdersApi(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<AdminOrdersListResponse>> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return adminFetch(`/orders/admin/all${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminStatsApi(): Promise<ApiResponse<AdminStatsResponse>> {
  return adminFetch("/orders/admin/stats");
}

export async function fetchOrderDetailsApi(id: string): Promise<ApiResponse<OrderResponse>> {
  return adminFetch(`/orders/${id}`);
}

export async function updateOrderStatusApi(
  id: string,
  status: OrderStatus,
  notes?: string,
): Promise<ApiResponse<OrderResponse>> {
  return adminFetch(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

export async function rejectOrderApi(
  id: string,
  reason?: string,
): Promise<ApiResponse<OrderResponse>> {
  return updateOrderStatusApi(
    id,
    OrderStatus.CANCELLED,
    reason ? `Rejected by Admin: ${reason}` : "Rejected by Dhaba Admin",
  );
}

