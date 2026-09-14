"use client";

import React, { useState } from "react";
import { ADMIN_CUSTOMERS } from "../../data/admin-mock";
import { Search, Phone, Mail, MapPin } from "lucide-react";

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");

  const filtered = ADMIN_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.location.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            Customer Directory
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Registered customers, lifetime order value, and address preferences.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or phone..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs text-stone-700">
          <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[11px] border-b border-stone-200">
            <tr>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Contact</th>
              <th className="py-3.5 px-4">Primary Delivery Area</th>
              <th className="py-3.5 px-4">Orders Count</th>
              <th className="py-3.5 px-4">Lifetime Spend</th>
              <th className="py-3.5 px-4">Last Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((cust) => (
              <tr key={cust.id} className="hover:bg-stone-50/70 transition">
                <td className="py-3.5 px-4 font-bold text-stone-900">
                  {cust.name}
                </td>
                <td className="py-3.5 px-4 space-y-0.5">
                  <span className="block text-stone-700">{cust.phone}</span>
                  <span className="block text-[10px] text-stone-400">
                    {cust.email}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-stone-600">{cust.location}</td>
                <td className="py-3.5 px-4 font-bold text-stone-900">
                  {cust.ordersCount} orders
                </td>
                <td className="py-3.5 px-4 font-extrabold text-amber-900">
                  ₹{cust.totalSpent.toLocaleString("en-IN")}
                </td>
                <td className="py-3.5 px-4 text-stone-500">
                  {cust.lastOrderDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
