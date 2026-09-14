"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CategorySummary, CreateCategoryDto } from "@repo/types";
import {
  fetchAdminCategoriesApi,
  createCategoryApi,
  deleteCategoryApi,
} from "../../lib/api-menu";
import { Button, useToast } from "@repo/ui";
import {
  Plus,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  FolderTree,
} from "lucide-react";

export default function AdminCategoriesPage() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategorySummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [formData, setFormData] = useState<CreateCategoryDto>({
    name: "",
    slug: "",
    description: "",
    icon: "🍲",
    displayOrder: 1,
  });

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminCategoriesApi();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to load categories from database.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast({
        title: "Validation Error",
        description: "Please enter a category name.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCategoryApi({
        ...formData,
        displayOrder: Number(formData.displayOrder || 0),
      });

      if (res.success && res.data) {
        setCategories((prev) => [...prev, res.data!]);
        setCreateModalOpen(false);
        setFormData({
          name: "",
          slug: "",
          description: "",
          icon: "🍲",
          displayOrder: 1,
        });
        addToast({
          title: "Category Created",
          description: `Category "${res.data.name}" added successfully.`,
          type: "success",
        });
      } else {
        addToast({
          title: "Creation Failed",
          description: res.error || "Could not create category.",
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

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteCategoryApi(deleteTarget.id);
      if (res.success) {
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        addToast({
          title: "Category Deleted",
          description: `Category "${deleteTarget.name}" was removed.`,
          type: "success",
        });
        setDeleteTarget(null);
      } else {
        addToast({
          title: "Cannot Delete",
          description: res.error || "Could not delete category.",
          type: "error",
        });
      }
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err.message || "Failed to delete category.",
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
            Category Management
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Organize customer menu categories, icons, slugs, and menu display hierarchy.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadCategories}>
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
            <span>Add Category</span>
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#78350F]" />
            <p className="text-xs font-semibold text-stone-500">Loading categories...</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Slug</th>
                <th className="py-3.5 px-4">Dishes</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-stone-50/70 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-stone-400">
                    #{cat.displayOrder}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-stone-500">
                    {cat.slug}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-stone-800">
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full text-stone-700">
                      {cat.productCount ?? 0} dishes
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600 max-w-sm truncate">
                    {cat.description || "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(cat)}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Category Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <FolderTree className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">
                  Add New Category
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

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-stone-700 block mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tandoori Snacks"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Icon Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🍢"
                    value={formData.icon || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    className="w-full text-center text-base px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  URL Slug (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. tandoori-snacks (auto-generated if empty)"
                  value={formData.slug || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description for menu header..."
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.displayOrder || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      displayOrder: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                />
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
                    <span>Add Category</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Delete Category
                </h3>
                <p className="text-xs text-stone-500">
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget.name}</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
              Categories that still have dishes linked cannot be deleted until those dishes are reassigned or removed.
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
                onClick={handleDeleteCategory}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Confirm Delete</span>
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
