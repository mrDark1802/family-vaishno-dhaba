"use client";

import React from "react";
import { useAdminAuth } from "../../context/admin-auth-context";
import { Clock, RefreshCw, LogOut, Shield } from "lucide-react";

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAdminAuth();

  return (
    <header className="h-16 bg-white border-b border-stone-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          Kitchen Live
        </span>
        <span className="text-xs text-stone-400 hidden sm:inline">•</span>
        <span className="text-xs text-stone-500 hidden sm:inline flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-stone-400" /> Pure Veg Dhaba Operations
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => window.location.reload()}
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
          title="Refresh Dashboard"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-stone-200" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#78350F] text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-bold text-stone-900 leading-none">
              {user?.name || "Dhaba Admin"}
            </span>
            <span className="block text-[10px] text-stone-400 mt-0.5">
              {user?.email || "fvd@admin.com"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition ml-1"
          title="Sign Out"
          aria-label="Sign out of admin portal"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
