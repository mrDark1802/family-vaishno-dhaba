import { Injectable, NotFoundException } from "@nestjs/common";
import { Banner, CreateBannerDto, UpdateBannerDto, UiSettings } from "../../types";

@Injectable()
export class BannersService {
  private banners: Banner[] = [
    {
      id: "banner-1",
      title: "Special Family Combos",
      subtitle: "Paneer Makhani, Dal Tadka, 4 Tandoori Rotis, Jeera Rice & Gulab Jamun",
      badge: "BEST VALUE",
      imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80",
      linkAction: "CATEGORY",
      targetId: "thali-combos",
      buttonText: "Order Combo",
      displayOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "banner-2",
      title: "Chinese & Fast Food Treats",
      subtitle: "Chilli Paneer Gravy, Veg Fried Rice, Spring Rolls & Crispy Momos",
      badge: "CRISPY & SPICY",
      imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80",
      linkAction: "CATEGORY",
      targetId: "chinese",
      buttonText: "Explore Fast Food",
      displayOrder: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "banner-3",
      title: "Fresh Morning Breakfast",
      subtitle: "Stuffed Aloo & Paneer Parathas served with Fresh Curd & Butter",
      badge: "FRESH DAILY",
      imageUrl: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80",
      linkAction: "CATEGORY",
      targetId: "breakfast",
      buttonText: "View Breakfast",
      displayOrder: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "banner-4",
      title: "All-Time Favourites",
      subtitle: "Our top customer rated signature dishes cooked fresh to order",
      badge: "TOP RATED",
      imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80",
      linkAction: "MENU",
      targetId: null,
      buttonText: "Browse Full Menu",
      displayOrder: 4,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  async getBanners(includeInactive = false): Promise<Banner[]> {
    const list = includeInactive
      ? this.banners
      : this.banners.filter((b) => b.isActive);
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getUiSettings(): Promise<UiSettings> {
    const banners = await this.getBanners(false);
    return {
      banners,
      sliderIntervalMs: 4500,
    };
  }

  async getBannerById(id: string): Promise<Banner> {
    const banner = this.banners.find((b) => b.id === id);
    if (!banner) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }
    return banner;
  }

  async createBanner(dto: CreateBannerDto): Promise<Banner> {
    const newBanner: Banner = {
      id: `banner-${Date.now()}`,
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      badge: dto.badge ?? null,
      imageUrl: dto.imageUrl,
      linkAction: dto.linkAction ?? "NONE",
      targetId: dto.targetId ?? null,
      buttonText: dto.buttonText ?? "Explore Now",
      displayOrder: dto.displayOrder ?? this.banners.length + 1,
      isActive: dto.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.banners.push(newBanner);
    return newBanner;
  }

  async updateBanner(id: string, dto: UpdateBannerDto): Promise<Banner> {
    const index = this.banners.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }
    const current = this.banners[index]!;
    const updated: Banner = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.banners[index] = updated;
    return updated;
  }

  async toggleBanner(id: string): Promise<Banner> {
    const banner = await this.getBannerById(id);
    banner.isActive = !banner.isActive;
    banner.updatedAt = new Date().toISOString();
    return banner;
  }

  async deleteBanner(id: string): Promise<{ success: boolean }> {
    const initialLen = this.banners.length;
    this.banners = this.banners.filter((b) => b.id !== id);
    if (this.banners.length === initialLen) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }
    return { success: true };
  }
}
