export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  imageUrl: string;
  linkAction?: 'CATEGORY' | 'DISH' | 'MENU' | 'OFFERS' | 'NONE';
  targetId?: string | null;
  displayOrder: number;
  isActive: boolean;
  buttonText?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBannerDto {
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl: string;
  linkAction?: 'CATEGORY' | 'DISH' | 'MENU' | 'OFFERS' | 'NONE';
  targetId?: string;
  displayOrder?: number;
  isActive?: boolean;
  buttonText?: string;
}

export interface UpdateBannerDto extends Partial<CreateBannerDto> {}

export interface CategoryUiSetting {
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  mealTag: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'CHINESE' | 'FAST_FOOD' | 'COMBOS' | 'GENERAL';
  featuredOrder?: number;
}

export interface UiSettings {
  banners: Banner[];
  categoriesUi?: CategoryUiSetting[];
  sliderIntervalMs?: number;
}
