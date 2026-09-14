"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, useToast } from "@repo/ui";
import { ArrowLeft, Sparkles, CheckCircle2, Loader2, Info } from "lucide-react";
import { CategorySummary, RegionalCuisine } from "@repo/types";
import { fetchAdminCategoriesApi, createDishApi } from "../../../lib/api-menu";

export default function AdminNewProductPage() {
  const router = useRouter();
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
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
  );
  const [prepTime, setPrepTime] = useState("15-20 mins");
  const [serves, setServes] = useState("1-2 people");
  const [isChefSpecial, setIsChefSpecial] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recommendedCount, setRecommendedCount] = useState(0);

  useEffect(() => {
    fetchAdminCategoriesApi().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setCategories(res.data);
        setCategoryId(res.data[0]?.id || "");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await createDishApi({
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
        isChefSpecial,
        isRecommended,
        isSpicy,
        isAvailable: true,
      });

      if (res.success) {
        addToast({
          title: "Dish Created",
          description: `"${name}" added to menu catalog with portion pricing.`,
          type: "success",
        });
        router.push("/menu");
      } else {
        addToast({
          title: "Creation Failed",
          description: res.error || "Could not save dish.",
          type: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Network error while saving dish.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/menu"
          className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-stone-900">Add New Dhaba Dish</h1>
          <p className="text-xs text-stone-500">
            Create a new item in your food catalog with dual half/full pricing support.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Dish Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shahi Paneer, Dal Makhani"
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78350F]"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Regional Cuisine Style
              </label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value as RegionalCuisine)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78350F]"
              >
                <option value="HIMACHALI">Himachali Heritage Dish</option>
                <option value="PUNJABI">Punjabi Highway Special</option>
                <option value="COMMON">Standard Pure Veg</option>
              </select>
            </div>
          </div>

          {/* Portion Pricing Config Card */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#78350F]" />
              <h3 className="text-xs font-black text-[#78350F] uppercase tracking-wider">
                Portion Sizes & Pricing
              </h3>
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
              placeholder="e.g. 15-20 mins"
            />
            <Input
              label="Serves"
              value={serves}
              onChange={(e) => setServes(e.target.value)}
              placeholder="e.g. 1-2 people"
            />
          </div>

          <Input
            label="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Short Description *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Crisp one-sentence summary for food cards and lists..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#78350F]"
              required
            />
          </div>

          {/* Toggles */}
          <div className="pt-2 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="rounded text-[#78350F] focus:ring-[#78350F] w-4 h-4"
              />
              <span className="font-bold text-stone-900">
                Recommended For You (Max 10 on Explore Screen)
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isChefSpecial}
                onChange={(e) => setIsChefSpecial(e.target.checked)}
                className="rounded text-[#78350F] focus:ring-[#78350F] w-4 h-4"
              />
              <span>Chef&apos;s Signature Special</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
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

        <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
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
                <span>Saving Dish...</span>
              </>
            ) : (
              <span>Save Dish to Catalog</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
