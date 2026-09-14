import React from "react";
import { usePathname } from "../../context/navigation-context";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { ToastProvider } from "@repo/ui";
import { AdminAuthProvider, useAdminAuth } from "../../context/admin-auth-context";
import { Loader2 } from "lucide-react";

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAdminAuth();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F4F0] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#78350F]" />
        <p className="text-xs font-semibold text-stone-500">
          Loading Dhaba Administration Portal...
        </p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via AdminAuthProvider
  }

  return (
    <div className="min-h-screen bg-[#F6F4F0] text-stone-900 flex antialiased">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  return (
    <ToastProvider>
      <AdminAuthProvider>
        <ShellContent>{children}</ShellContent>
      </AdminAuthProvider>
    </ToastProvider>
  );
};
