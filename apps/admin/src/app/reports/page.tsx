"use client";

import React from "react";
import { IndianRupee, TrendingUp, ShoppingBag, Utensils } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">
          Sales & Performance Reports
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Weekly revenue breakdown, top category volume, and average order
          metrics.
        </p>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase text-stone-400">
            Weekly Revenue
          </span>
          <p className="text-2xl font-black text-stone-900">₹1,84,200</p>
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% growth
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase text-stone-400">
            Weekly Orders
          </span>
          <p className="text-2xl font-black text-stone-900">264 Orders</p>
          <span className="text-xs text-stone-500">
            Average 38 orders / day
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase text-stone-400">
            Average Ticket Size
          </span>
          <p className="text-2xl font-black text-amber-900">₹698</p>
          <span className="text-xs text-stone-500">
            Across delivery & takeaway
          </span>
        </div>
      </div>

      {/* Category Sales Breakdown */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
          Revenue by Culinary Category
        </h2>

        <div className="space-y-4">
          {[
            {
              category: "Himachali Dham Specials",
              share: "38%",
              amount: "₹70,000",
              color: "bg-teal-700",
            },
            {
              category: "Punjabi Dhaba Classics",
              share: "34%",
              amount: "₹62,600",
              color: "bg-amber-700",
            },
            {
              category: "Tandoori Breads & Kulchas",
              share: "16%",
              amount: "₹29,500",
              color: "bg-stone-800",
            },
            {
              category: "Beverages & Desserts",
              share: "12%",
              amount: "₹22,100",
              color: "bg-orange-600",
            },
          ].map((item) => (
            <div key={item.category} className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-stone-800">{item.category}</span>
                <span className="text-stone-900">
                  {item.amount} ({item.share})
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`${item.color} h-2.5 rounded-full`}
                  style={{ width: item.share }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
