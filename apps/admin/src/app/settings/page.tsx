"use client";

import React, { useState } from "react";
import { Button, Input } from "@repo/ui";
import { ShieldCheck, Store, Clock, Bike, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">
          Dhaba Configuration & Settings
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Manage restaurant operational hours, delivery radius, phone desk, and
          pure veg policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Restaurant Identity */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-800" /> Restaurant Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Restaurant Name"
              defaultValue="Family Vaishno Dhaba"
              required
            />
            <Input
              label="Tagline"
              defaultValue="Authentic Punjabi & Himachali Pure Veg Cuisine"
              required
            />
            <Input
              label="Primary Desk Phone"
              defaultValue="+91 98160 12345"
              required
            />
            <Input
              label="Support Email"
              defaultValue="namaste@familyvaishnodhaba.com"
              required
            />
          </div>

          <Input
            label="Highway Address"
            defaultValue="NH 154, Near Kangra Bypass, Kangra, HP 176001"
            required
          />
        </div>

        {/* Operational Hours */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-800" /> Operating Timings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Opening Time" defaultValue="08:00 AM" required />
            <Input
              label="Kitchen Closing Time"
              defaultValue="10:30 PM"
              required
            />
            <Input
              label="Dhaba Closing Time"
              defaultValue="11:00 PM"
              required
            />
          </div>
        </div>

        {/* Delivery Rules */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <Bike className="w-4 h-4 text-amber-800" /> Delivery Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Max Delivery Radius (km)"
              defaultValue="12"
              required
            />
            <Input
              label="Standard Delivery Fee (₹)"
              defaultValue="40"
              required
            />
            <Input
              label="Free Delivery Threshold (₹)"
              defaultValue="600"
              required
            />
          </div>
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg">
            Save Dhaba Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
