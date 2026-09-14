export const API_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

export async function adminFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include", // Send HTTP-only session cookie
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(", ") : null) ||
        `Request failed with status ${res.status}`;
      return { success: false, error: errorMsg };
    }

    // NestJS TransformInterceptor returns { success: true, data: ... }
    if (data && typeof data === "object" && "success" in data && "data" in data) {
      return data;
    }

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to connect to backend server.",
    };
  }
}
