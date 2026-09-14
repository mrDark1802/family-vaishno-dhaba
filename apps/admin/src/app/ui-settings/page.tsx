"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Banner, CreateBannerDto } from "@repo/types";
import {
  fetchAdminBannersApi,
  createBannerApi,
  updateBannerApi,
  toggleBannerApi,
  deleteBannerApi,
} from "../../lib/api-banners";
import { Button, useToast } from "@repo/ui";
import {
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  X,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Layers,
  ChevronRight,
  Eye,
} from "lucide-react";

export default function AdminUiSettingsPage() {
  const { addToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<"SLIDER" | "SINGLE">("SLIDER");
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateBannerDto>({
    title: "",
    subtitle: "",
    badge: "SPECIAL",
    imageUrl: "",
    linkAction: "CATEGORY",
    targetId: "",
    buttonText: "Order Now",
    displayOrder: 1,
    isActive: true,
  });

  const loadBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminBannersApi(true);
      if (res.success && res.data) {
        setBanners(res.data);
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to load UI banners.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      subtitle: "",
      badge: "BEST VALUE",
      imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80",
      linkAction: "CATEGORY",
      targetId: "combos",
      buttonText: "Order Now",
      displayOrder: banners.length + 1,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      badge: banner.badge || "",
      imageUrl: banner.imageUrl,
      linkAction: banner.linkAction || "CATEGORY",
      targetId: banner.targetId || "",
      buttonText: banner.buttonText || "Order Now",
      displayOrder: banner.displayOrder,
      isActive: banner.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.imageUrl.trim()) {
      addToast({
        title: "Validation Error",
        description: "Please provide both banner title and image URL.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBanner) {
        const res = await updateBannerApi(editingBanner.id, formData);
        if (res.success) {
          addToast({
            title: "Banner Updated",
            description: "Mobile app banner updated successfully.",
            type: "success",
          });
          setModalOpen(false);
          loadBanners();
        }
      } else {
        const res = await createBannerApi(formData);
        if (res.success) {
          addToast({
            title: "Banner Created",
            description: "New banner added to mobile Explore screen.",
            type: "success",
          });
          setModalOpen(false);
          loadBanners();
        }
      }
    } catch {
      addToast({
        title: "Save Failed",
        description: "Could not save banner to server.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (banner: Banner) => {
    try {
      await toggleBannerApi(banner.id);
      addToast({
        title: "Status Updated",
        description: `Banner "${banner.title}" is now ${banner.isActive ? "hidden" : "active"}.`,
        type: "info",
      });
      loadBanners();
    } catch {
      addToast({
        title: "Toggle Error",
        description: "Failed to toggle banner status.",
        type: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBannerApi(deleteTarget.id);
      addToast({
        title: "Banner Deleted",
        description: `Banner "${deleteTarget.title}" was removed.`,
        type: "success",
      });
      setDeleteTarget(null);
      loadBanners();
    } catch {
      addToast({
        title: "Delete Failed",
        description: "Failed to delete banner.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const activeBanners = banners.filter((b) => b.isActive);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-amber-700" />
            App Banners & UI Settings
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage mobile app Explore banners, sliders, and category background image visual settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBanners}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white"
          >
            <Plus className="w-4 h-4" />
            Add New Banner
          </Button>
        </div>
      </div>

      {/* Grid: Left = Banner List & Management, Right = Mobile Live Simulator Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Banners Management List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-700" />
                  Active Banners ({activeBanners.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {activeBanners.length === 1
                    ? "Single Banner Mode is active on mobile Explore page."
                    : activeBanners.length > 1
                      ? `Multi-image Slider Mode is active with ${activeBanners.length} rotating slides.`
                      : "No active banners. Default fallback will display."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">
                  Total: {banners.length}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-700" />
                <p className="text-xs font-medium">Loading banners...</p>
              </div>
            ) : banners.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-xl">
                <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-stone-700">No Banners Found</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Add your first banner to highlight special combos, fast food, or breakfast promotions.
                </p>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  className="mt-4 bg-amber-800 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create First Banner
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.map((banner, index) => (
                  <div
                    key={banner.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition ${
                      banner.isActive
                        ? "bg-white border-stone-200 hover:border-amber-300 shadow-xs"
                        : "bg-stone-50 border-stone-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      {/* Thumbnail Preview */}
                      <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 relative bg-stone-900 border border-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                        {banner.badge && (
                          <span className="absolute top-1 left-1 bg-amber-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                            {banner.badge}
                          </span>
                        )}
                      </div>

                      {/* Content Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                            #{banner.displayOrder}
                          </span>
                          <h3 className="text-sm font-black text-stone-900">
                            {banner.title}
                          </h3>
                        </div>
                        {banner.subtitle && (
                          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                            {banner.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone-400 font-semibold">
                          <span>Action: {banner.linkAction || "CATEGORY"}</span>
                          <span>•</span>
                          <span>Btn: &quot;{banner.buttonText || "Order Now"}&quot;</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(banner)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold transition ${
                          banner.isActive
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                        }`}
                      >
                        {banner.isActive ? "Active" : "Hidden"}
                      </button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(banner)}
                        className="text-xs h-8 px-2.5"
                      >
                        Edit
                      </Button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(banner)}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick UI Preset Reference for Categories */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-amber-700" />
              Category Background Food Photography
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Categories displayed with visual cards on the mobile Explore page (Chinese, Fast Food, Breakfast, Lunch, Dinner, Combos).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "Chinese & Indo-Chinese", tag: "CHINESE", count: "12+ Dishes" },
                { name: "Fast Food & Snacks", tag: "FAST_FOOD", count: "15+ Dishes" },
                { name: "Breakfast Specials", tag: "BREAKFAST", count: "10+ Dishes" },
                { name: "Lunch & Thalis", tag: "LUNCH", count: "8+ Thalis" },
                { name: "Dinner Curries", tag: "DINNER", count: "20+ Curries" },
                { name: "Best Combos", tag: "COMBOS", count: "6+ Combos" },
                { name: "Breads & Naans", tag: "BREADS", count: "10+ Breads" },
                { name: "Beverages & Lassi", tag: "BEVERAGES", count: "8+ Drinks" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs"
                >
                  <p className="font-bold text-stone-900">{c.name}</p>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                    <span className="font-extrabold text-amber-800">{c.tag}</span>
                    <span>{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outdoor Catering & Bulk Order Service Settings */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Special Service Cards (Outdoor Catering & Bulk Orders)
            </h2>
            <p className="text-xs text-stone-500">
              Configure promotional contact cards displayed on the mobile Explore page below recommended items.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Outdoor Catering Card */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900">Outdoor Catering Service</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Active on Mobile
                  </span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Live cooking counters & buffet setups for weddings, birthdays and celebrations.
                </p>
                <div className="text-[10px] text-stone-400 pt-1">
                  CTA Action: Direct Phone & WhatsApp Dial
                </div>
              </div>

              {/* Bulk Orders Card */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900">Bulk Orders & Family Feasts</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Active on Mobile
                  </span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Special bulk rates for 10+ people office lunches and large gatherings.
                </p>
                <div className="text-[10px] text-stone-400 pt-1">
                  CTA Action: Bulk Order Enquiries
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Mobile App Live Simulator Preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-700" />
                Mobile App Live Simulator
              </h2>
              <div className="flex bg-stone-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewMode("SLIDER")}
                  className={`px-2 py-1 rounded-md transition ${
                    previewMode === "SLIDER"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Slider
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("SINGLE")}
                  className={`px-2 py-1 rounded-md transition ${
                    previewMode === "SINGLE"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Single
                </button>
              </div>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Real-time representation of how banners appear inside the Expo React Native customer app.
            </p>

            {/* Simulated Phone Shell */}
            <div className="border-4 border-stone-900 rounded-3xl p-3 bg-stone-50 shadow-md">
              {/* Header simulation */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-800 flex items-center justify-center text-white text-[10px] font-black">
                    FVD
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-stone-900 leading-tight">
                      Family Vaishno Dhaba
                    </p>
                    <p className="text-[9px] font-bold text-emerald-700">
                      100% Pure Vegetarian
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner Area Simulator */}
              {activeBanners.length > 0 ? (
                <div className="space-y-2">
                  {/* Active Banner Slide */}
                  {(() => {
                    const currentBanner =
                      previewMode === "SINGLE"
                        ? activeBanners[0]
                        : activeBanners[activePreviewIndex % activeBanners.length];
                    if (!currentBanner) return null;

                    return (
                      <div className="relative h-40 rounded-2xl overflow-hidden bg-stone-900 shadow-sm flex flex-col justify-end p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentBanner.imageUrl}
                          alt={currentBanner.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-85"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        <div className="relative z-10 space-y-1">
                          {currentBanner.badge && (
                            <span className="inline-flex items-center gap-1 bg-amber-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                              <Sparkles className="w-2.5 h-2.5" />
                              {currentBanner.badge}
                            </span>
                          )}
                          <h4 className="text-white text-xs font-black leading-tight drop-shadow-xs">
                            {currentBanner.title}
                          </h4>
                          {currentBanner.subtitle && (
                            <p className="text-stone-200 text-[10px] line-clamp-1 leading-tight">
                              {currentBanner.subtitle}
                            </p>
                          )}
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-[9px] font-extrabold px-2 py-0.5 rounded">
                              {currentBanner.buttonText || "Order Now"}
                              <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Slider Indicator Dots Simulator */}
                  {previewMode === "SLIDER" && activeBanners.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 py-1">
                      {activeBanners.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActivePreviewIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            activePreviewIndex === i
                              ? "w-4 bg-amber-700"
                              : "w-1.5 bg-stone-300 hover:bg-stone-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-40 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center text-xs text-stone-400">
                  No active banner to display
                </div>
              )}

              {/* Simulated Category Preview */}
              <div className="mt-4 pt-3 border-t border-stone-200">
                <p className="text-[11px] font-black text-stone-900 mb-2">
                  Explore by Category
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-16 rounded-xl bg-stone-800 text-white p-2 flex flex-col justify-end text-[10px] font-bold">
                    <span>Chinese Special</span>
                  </div>
                  <div className="h-16 rounded-xl bg-stone-800 text-white p-2 flex flex-col justify-end text-[10px] font-bold">
                    <span>Fast Food</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Banner */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h3 className="text-base font-black text-stone-900">
                {editingBanner ? "Edit App Banner" : "Add New App Banner"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Banner Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Family Combos"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dal Makhani, Shahi Paneer, Rotis & Rice"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BEST VALUE, 20% OFF"
                    value={formData.badge}
                    onChange={(e) =>
                      setFormData({ ...formData, badge: e.target.value })
                    }
                    className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Button CTA
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Order Now, Explore"
                    value={formData.buttonText}
                    onChange={(e) =>
                      setFormData({ ...formData, buttonText: e.target.value })
                    }
                    className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Banner Image URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                {formData.imageUrl && (
                  <div className="mt-2 h-24 rounded-lg overflow-hidden border border-stone-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Link Action
                  </label>
                  <select
                    value={formData.linkAction}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        linkAction: e.target.value as any,
                      })
                    }
                    className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="CATEGORY">Navigate to Category</option>
                    <option value="DISH">Navigate to Dish</option>
                    <option value="MENU">Navigate to Full Menu</option>
                    <option value="OFFERS">Navigate to Offers</option>
                    <option value="NONE">No Action</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayOrder: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full text-xs font-semibold px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded text-amber-800 focus:ring-amber-500 h-4 w-4"
                />
                <label
                  htmlFor="isActiveToggle"
                  className="text-xs font-bold text-stone-800"
                >
                  Publish Immediately on Mobile App
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-amber-800 hover:bg-amber-900 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  )}
                  {editingBanner ? "Save Changes" : "Create Banner"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-black text-stone-900 mb-2">
              Delete Banner?
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-5">
              Are you sure you want to delete banner &quot;
              <strong className="text-stone-800">{deleteTarget.title}</strong>&quot;?
              This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
