"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CouponSummary, CreateCouponDto } from "@repo/types";
import {
  fetchAdminCouponsApi,
  createCouponApi,
  toggleCouponApi,
  deleteCouponApi,
} from "../../lib/api-coupons";
import { Button, useToast } from "@repo/ui";
import {
  Plus,
  Tag,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Loader2,
  Percent,
  IndianRupee,
  X,
  AlertTriangle,
} from "lucide-react";

export default function AdminCouponsPage() {
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState<CouponSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CouponSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [formData, setFormData] = useState<CreateCouponDto>({
    code: "",
    title: "",
    description: "",
    discountType: "FLAT",
    value: 50,
    minOrderAmount: 350,
    maxDiscount: undefined,
  });

  const loadCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminCouponsApi(true);
      if (res.success && res.data) {
        setCoupons(res.data);
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to load coupons from database.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleToggle = async (id: string) => {
    setIsToggling(id);
    try {
      const res = await toggleCouponApi(id);
      if (res.success && res.data) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? res.data! : c)),
        );
        addToast({
          title: "Coupon Updated",
          description: `Coupon "${res.data.code}" is now ${res.data.isActive ? "Active" : "Disabled"}.`,
          type: "success",
        });
      }
    } catch {
      addToast({
        title: "Toggle Failed",
        description: "Could not change coupon status.",
        type: "error",
      });
    } finally {
      setIsToggling(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) {
      addToast({
        title: "Validation Error",
        description: "Please provide a coupon code and title.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCouponApi({
        ...formData,
        code: formData.code.trim().toUpperCase(),
        value: Number(formData.value),
        minOrderAmount: Number(formData.minOrderAmount || 0),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
      });

      if (res.success && res.data) {
        setCoupons((prev) => [res.data!, ...prev]);
        setCreateModalOpen(false);
        setFormData({
          code: "",
          title: "",
          description: "",
          discountType: "FLAT",
          value: 50,
          minOrderAmount: 350,
          maxDiscount: undefined,
        });
        addToast({
          title: "Coupon Created",
          description: `Promo code "${res.data.code}" created successfully!`,
          type: "success",
        });
      } else {
        addToast({
          title: "Creation Failed",
          description: res.error || "Could not create coupon.",
          type: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteCouponApi(deleteTarget.id);
      if (res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        addToast({
          title: "Coupon Deleted",
          description: `Coupon "${deleteTarget.code}" was permanently deleted.`,
          type: "success",
        });
        setDeleteTarget(null);
      } else {
        addToast({
          title: "Delete Failed",
          description: res.error || "Could not delete coupon.",
          type: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to delete coupon.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            Promotions & Coupons
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage discount codes, percentage offers, and minimum order rules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadCoupons}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </Button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#78350F]" />
            <p className="text-xs font-semibold text-stone-500">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Tag className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-base font-bold text-stone-900">No Coupons Available</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Create your first promotional discount code to reward loyal dhaba customers.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add New Coupon
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] border-b border-stone-200">
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4">Offer Title</th>
                  <th className="py-3.5 px-4">Discount Value</th>
                  <th className="py-3.5 px-4">Min Order</th>
                  <th className="py-3.5 px-4">Usage</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-900 text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {c.code}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-stone-900">{c.title}</p>
                      {c.description && (
                        <p className="text-[11px] text-stone-500 max-w-xs truncate">
                          {c.description}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-black text-stone-900 text-sm">
                      {c.discountType === "FLAT" ? (
                        <span className="text-emerald-700">₹{c.value} FLAT</span>
                      ) : (
                        <span className="text-amber-800">
                          {c.value}% OFF
                          {c.maxDiscount ? ` (Max ₹${c.maxDiscount})` : ""}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-stone-600 font-medium">
                      ₹{c.minOrderAmount}
                    </td>

                    <td className="py-3.5 px-4 text-stone-500">
                      {c.usageCount} times applied
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={isToggling === c.id}
                        onClick={() => handleToggle(c.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                          c.isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200"
                        }`}
                      >
                        {c.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-stone-400" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">
                  Create Promotional Coupon
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE50"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full uppercase font-mono px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as "FLAT" | "PERCENT",
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                  >
                    <option value="FLAT">Flat ₹ Discount</option>
                    <option value="PERCENT">% Percentage Discount</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Offer Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat ₹50 Off on Punjabi Feasts"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Valid on all curries and breads above ₹350"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Min Cart Value (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.minOrderAmount || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderAmount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Max Cap (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Optional"
                    value={formData.maxDiscount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscount: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Coupon</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Coupon Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Delete Coupon Code
                </h3>
                <p className="text-xs text-stone-500">
                  Are you sure you want to delete{" "}
                  <strong className="font-mono text-amber-900">
                    {deleteTarget.code}
                  </strong>
                  ?
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
              This will permanently delete the promo code from the system. Customers will no longer be able to apply it at checkout.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteCoupon}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete Coupon</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
