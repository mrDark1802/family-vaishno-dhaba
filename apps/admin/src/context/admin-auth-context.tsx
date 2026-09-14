import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "./navigation-context";
import { CustomerProfile, UserRole } from "@repo/types";
import {
  fetchAdminProfileApi,
  loginAdminApi,
  logoutAdminApi,
} from "../lib/api-auth";

interface AdminAuthContextType {
  user: CustomerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (
    identifier: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined,
);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const res = await fetchAdminProfileApi();
      if (res.success && res.data) {
        // Validate user role
        if (
          res.data.role === UserRole.ADMIN ||
          (res.data.role as any) === "ADMIN" ||
          (res.data.role as any) === "STAFF"
        ) {
          setUser(res.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const isLoginPage = pathname === "/login";
      const isAuthedAdmin =
        user &&
        (user.role === UserRole.ADMIN ||
          (user.role as any) === "ADMIN" ||
          (user.role as any) === "STAFF");

      if (!isAuthedAdmin && !isLoginPage) {
        router.replace("/login");
      } else if (isAuthedAdmin && isLoginPage) {
        router.replace("/");
      }
    }
  }, [isLoading, user, pathname, router]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await loginAdminApi({ identifier, password });
      if (res.success && res.data?.user) {
        const loggedUser = res.data.user;
        if (
          loggedUser.role === UserRole.ADMIN ||
          (loggedUser.role as any) === "ADMIN" ||
          (loggedUser.role as any) === "STAFF"
        ) {
          setUser(loggedUser);
          router.replace("/");
          return { success: true };
        } else {
          await logoutAdminApi();
          return {
            success: false,
            error:
              "Access denied. Only authorized Dhaba administrators can access this portal.",
          };
        }
      }
      return {
        success: false,
        error: res.error || "Invalid administrator credentials.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Login request failed.",
      };
    }
  };

  const logout = async () => {
    try {
      await logoutAdminApi();
    } finally {
      setUser(null);
      router.replace("/login");
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin:
          user?.role === UserRole.ADMIN || (user?.role as any) === "ADMIN",
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
