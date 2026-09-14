"use client";

import React, { useState } from "react";
import { useAdminAuth } from "../../context/admin-auth-context";
import { Button, Input } from "@repo/ui";
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChefHat,
  ArrowRight,
  Info,
} from "lucide-react";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [identifier, setIdentifier] = useState("fvd@admin.com");
  const [password, setPassword] = useState("fvd@123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Please enter both administrator email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await login(identifier.trim(), password.trim());
    if (!result.success) {
      setErrorMessage(result.error || "Login failed. Please check credentials.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        {/* Brand Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#78350F] text-white flex items-center justify-center shadow-lg shadow-amber-950/20">
          <ChefHat className="w-9 h-9 text-amber-300" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Family Vaishno Dhaba
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-medium">
          Dhaba Management Console & Operations Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-stone-200/60 rounded-3xl sm:px-10 border border-stone-200 space-y-6">
          <div className="border-b border-stone-100 pb-4 text-center">
            <h2 className="text-lg font-bold text-stone-900">Admin Sign In</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Enter your authorized staff credentials to continue.
            </p>
          </div>

          {/* Quick Demo Credentials Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Dhaba Admin Credentials:</span>
            </div>
            <div className="font-mono text-[11px] bg-white/80 p-2 rounded border border-amber-200/60 space-y-0.5 text-stone-800">
              <div>Email: <span className="font-bold text-amber-900">fvd@admin.com</span></div>
              <div>Password: <span className="font-bold text-amber-900">fvd@123</span></div>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="block text-xs font-bold uppercase tracking-wider text-stone-700"
              >
                Administrator Email / Mobile
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="fvd@admin.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#78350F]"
                />
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-stone-700"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#78350F]"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#78350F] hover:bg-[#5f290b] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Admin Access...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-stone-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted Session with Role-Based Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
