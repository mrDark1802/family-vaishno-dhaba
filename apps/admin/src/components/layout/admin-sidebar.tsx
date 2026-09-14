"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  Layers,
  Users,
  Tag,
  Star,
  BarChart3,
  Settings,
  Sliders,
  ExternalLink,
} from "lucide-react";

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: "Live Dashboard", href: "/", icon: LayoutDashboard },
    {
      label: "Kitchen & Orders",
      href: "/orders",
      icon: ShoppingBag,
      badge: "6",
    },
    { label: "Menu Dishes", href: "/menu", icon: UtensilsCrossed },
    { label: "Categories", href: "/categories", icon: Layers },
    { label: "App Banners & UI", href: "/ui-settings", icon: Sliders },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Coupons & Deals", href: "/coupons", icon: Tag },
    { label: "Customer Reviews", href: "/reviews", icon: Star },
    { label: "Sales Reports", href: "/reports", icon: BarChart3 },
    { label: "Dhaba Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-stone-900 text-stone-300 border-r border-stone-800 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="p-5 space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <span className="text-2xl">🍲</span>
          <div>
            <h2 className="font-extrabold text-sm text-white tracking-wide">
              Family Vaishno Dhaba
            </h2>
            <p className="text-[11px] text-amber-400 font-medium">
              Operations Console
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-amber-800 text-white shadow-xs"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/80"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-amber-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Customer Web Link */}
      <div className="p-4 border-t border-stone-800">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-medium transition"
        >
          <span>Open Customer App</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </aside>
  );
};
