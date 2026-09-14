import React, { useState, useEffect, useCallback } from "react";
import { Link } from "../../context/navigation-context";
import { ProductSummary } from "@repo/types";
import {
  fetchAdminMenuApi,
  toggleDishAvailabilityApi,
  deleteDishApi,
} from "../../lib/api-menu";
import { Button, useToast } from "@repo/ui";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

export default function AdminMenuPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ProductSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminMenuApi({ search: search.trim() || undefined });
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to fetch menu items from database.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const handleToggleAvailability = async (id: string) => {
    setIsToggling(id);
    try {
      const res = await toggleDishAvailabilityApi(id);
      if (res.success && res.data) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? res.data! : item)),
        );
        addToast({
          title: "Availability Updated",
          description: `${res.data.name} is now ${res.data.isAvailable ? "In Stock" : "Sold Out"}.`,
          type: "success",
        });
      }
    } catch {
      addToast({
        title: "Update Failed",
        description: "Could not change item availability.",
        type: "error",
      });
    } finally {
      setIsToggling(null);
    }
  };

  const handleDeleteDish = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteDishApi(deleteTarget.id);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        addToast({
          title: "Dish Deleted",
          description: `"${deleteTarget.name}" has been removed from the menu.`,
          type: "success",
        });
        setDeleteTarget(null);
      } else {
        addToast({
          title: "Delete Failed",
          description: res.error || "Could not delete dish.",
          type: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to delete dish.",
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
            Menu Catalog & Portion Pricing
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage live dishes, full and half portion prices, kitchen availability, and catalog deletions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadMenu}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/menu/new">
            <Button size="sm" variant="primary" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search dish by name, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-stone-500">
          <span>
            Total Dishes: <strong className="text-stone-900">{items.length}</strong>
          </span>
          <span>
            With Half Option:{" "}
            <strong className="text-amber-800">
              {items.filter((i) => i.hasHalfOption).length}
            </strong>
          </span>
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#78350F]" />
            <p className="text-xs font-semibold text-stone-500">Loading dishes from database...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-base font-bold text-stone-900">No dishes found</p>
            <p className="text-xs text-stone-500">
              Try searching with a different keyword or create a new dish.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px] bg-stone-50/50">
                  <th className="py-3 px-4">Dish Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Cuisine</th>
                  <th className="py-3 px-4">Full Price</th>
                  <th className="py-3 px-4">Half Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {items.map((dish) => (
                  <tr key={dish.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">
                          {dish.name}
                        </span>
                        {dish.isChefSpecial && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold text-[9px]">
                            <Sparkles className="w-2.5 h-2.5" /> Special
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {dish.category?.name || "General"}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                        {dish.cuisine}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-black text-stone-900 text-sm">
                        ₹{dish.price}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {dish.hasHalfOption && dish.halfPrice ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[#B43403] text-sm">
                            ₹{dish.halfPrice}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            ENABLED
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">None (Full only)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={isToggling === dish.id}
                        onClick={() => handleToggleAvailability(dish.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          dish.isAvailable
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200"
                        }`}
                      >
                        {dish.isAvailable ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>In Stock</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-stone-400" />
                            <span>Sold Out</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/menu/${dish.id}`}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(dish)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Dish Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Delete Menu Dish
                </h3>
                <p className="text-xs text-stone-500">
                  Are you sure you want to delete{" "}
                  <strong className="text-stone-900">{deleteTarget.name}</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
              This will permanently remove this dish and its portion pricing from the active dhaba catalog.
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
                onClick={handleDeleteDish}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete Dish</span>
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
