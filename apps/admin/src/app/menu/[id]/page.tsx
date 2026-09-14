"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button, Input, useToast } from "@repo/ui";
import { ArrowLeft, Sparkles, CheckCircle2, Loader2, Info } from "lucide-react";
import { CategorySummary, RegionalCuisine } from "@repo/types";
import {
  fetchAdminCategoriesApi,
  fetchAdminDishByIdApi,
  updateDishApi,
  deleteDishApi,
} from "../../../lib/api-menu";
import { Trash2, AlertTriangle } from "lucide-react";

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const dishId = Array.isArray(rawId) ? rawId[0] : (rawId as string);
  const { addToast } = useToast();

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState<RegionalCuisine>("HIMACHALI");
  const [price, setPrice] = useState("200");
  const [hasHalfOption, setHasHalfOption] = useState(false);
  const [halfPrice, setHalfPrice] = useState("120");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prepTime, setPrepTime] = useState("15-20 mins");
  const [serves, setServes] = useState("1-2 people");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isChefSpecial, setIsChefSpecial] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [catsRes, dishRes] = await Promise.all([
          fetchAdminCategoriesApi(),
          fetchAdminDishByIdApi(dishId),
        ]);

        if (isMounted) {
          if (catsRes.success && catsRes.data) {
            setCategories(catsRes.data);
          }
          if (dishRes.success && dishRes.data) {
            const d = dishRes.data;
            setName(d.name);
            setCategoryId(d.categoryId);
            setCuisine(d.cuisine);
            setPrice(String(d.price));
            setHasHalfOption(Boolean(d.hasHalfOption));
            setHalfPrice(d.halfPrice ? String(d.halfPrice) : "100");
            setDescription(d.description || "");
            setLongDescription(d.longDescription || "");
            setImageUrl(d.imageUrl || "");
            setPrepTime(d.preparationTime || "15 mins");
            setServes(d.serves || "1-2 people");
            setIsAvailable(d.isAvailable);
            setIsChefSpecial(Boolean(d.isChefSpecial));
            setIsRecommended(Boolean(d.isRecommended));
            setIsSpicy(Boolean(d.isSpicy));
          }
        }
      } catch {
        addToast({
          title: "Error",
          description: "Failed to load dish details.",
          type: "error",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (dishId) loadData();
    return () => {
      isMounted = false;
    };
  }, [dishId, addToast]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !price) {
      addToast({
        title: "Validation Error",
        description: "Please fill in all mandatory fields.",
        type: "error",
      });
      return;
    }

    if (hasHalfOption && (!halfPrice || Number(halfPrice) <= 0)) {
      addToast({
        title: "Portion Pricing Required",
        description: "Please enter a valid price for the Half portion.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateDishApi(dishId, {
        name: name.trim(),
        categoryId,
        cuisine,
        price: Number(price),
        hasHalfOption,
        halfPrice: hasHalfOption ? Number(halfPrice) : null,
        description: description.trim() || undefined,
        longDescription: longDescription.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        preparationTime: prepTime,
        serves,
        isAvailable,
        isChefSpecial,
        isRecommended,
        isSpicy,
      });

      if (res.success) {
        addToast({
          title: "Dish Updated",
          description: `"${name}" portion pricing and recipe updated successfully.`,
          type: "success",
        });
        router.push("/menu");
      } else {
        addToast({
          title: "Update Failed",
          description: res.error || "Could not update dish.",
          type: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Network error while updating dish.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDish = async () => {

    setIsDeleting(true);
    try {
      const res = await deleteDishApi(dishId);
      if (res.success) {
        addToast({
          title: "Dish Deleted",
          description: `"${name}" was deleted from the menu catalog.`,
          type: "success",
        });
        router.push("/menu");
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

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#78350F]" />
        <p className="text-xs font-semibold text-stone-500">Loading recipe & pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Menu
        </Link>
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Dish</span>
        </button>
      </div>

      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-extrabold text-stone-900">
          Edit Recipe & Portion Pricing
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Update prices for Full and Half portions, dietary tags, and kitchen availability.
        </p>
      </div>

      <form
        onSubmit={handleUpdate}
        className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-2xs"
      >
        <div className="space-y-5">
          <Input
            label="Dish Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#78350F]"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Cuisine Origin *
              </label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#78350F]"
              >
                <option value="HIMACHALI">🏔️ Himachali Dham Specialty</option>
                <option value="PUNJABI">🧈 Punjabi Dhaba Classic</option>
                <option value="COMMON">North Indian / Common</option>
              </select>
            </div>
          </div>

          {/* Pricing & Portion Options Section */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <Info className="w-4 h-4 text-amber-700" />
              <span>Portion & Pricing Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Portion Price (₹ INR) *"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />

              {hasHalfOption ? (
                <Input
                  label="Half Portion Price (₹ INR) *"
                  type="number"
                  value={halfPrice}
                  onChange={(e) => setHalfPrice(e.target.value)}
                  required
                />
              ) : (
                <div className="flex items-center justify-center p-3 bg-white/70 rounded-xl border border-stone-200 text-xs text-stone-400 italic">
                  Half portion currently disabled for this item.
                </div>
              )}
            </div>

            {/* Checkbox to enable Half Option */}
            <label className="flex items-center gap-2.5 text-xs font-bold text-stone-800 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasHalfOption}
                onChange={(e) => setHasHalfOption(e.target.checked)}
                className="rounded text-[#78350F] focus:ring-[#78350F] w-4 h-4"
              />
              <span>
                Offer Half Portion for this dish (e.g. curries, dal, gravies, rice)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Preparation Time"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
            <Input
              label="Serves"
              value={serves}
              onChange={(e) => setServes(e.target.value)}
            />
          </div>

          <Input
            label="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Description *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#78350F]"
              required
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="rounded text-[#78350F] focus:ring-[#78350F] w-4 h-4"
              />
              <span>In Stock (Available on Storefront)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="rounded text-[#78350F] focus:ring-[#78350F] w-4 h-4"
              />
              <span className="font-extrabold text-stone-900">
                Recommended For You (Max 10 on Explore Screen)
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isChefSpecial}
                onChange={(e) => setIsChefSpecial(e.target.checked)}
                className="rounded text-[#78350F] focus:ring-[#78350F] w-4 h-4"
              />
              <span>Chef&apos;s Signature Special</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isSpicy}
                onChange={(e) => setIsSpicy(e.target.checked)}
                className="rounded text-[#78350F] focus:ring-[#78350F] w-4 h-4"
              />
              <span>Spicy Recipe</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs text-red-600 hover:text-red-800 font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete This Dish</span>
          </button>

          <div className="flex items-center gap-3">
            <Link href="/menu">
              <Button type="button" variant="outline" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Updating Dish...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Delete &ldquo;{name}&rdquo;?
                </h3>
                <p className="text-xs text-stone-500">
                  This dish will be permanently removed from the active catalog.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
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

