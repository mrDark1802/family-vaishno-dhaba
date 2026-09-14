export const RegionalCuisine = {
  PUNJABI: "PUNJABI",
  HIMACHALI: "HIMACHALI",
  COMMON: "COMMON",
} as const;

export type RegionalCuisine =
  (typeof RegionalCuisine)[keyof typeof RegionalCuisine];

export interface CustomizationChoice {
  name: string;
  price: number;
}

export interface CustomizationOption {
  name: string;
  choices: CustomizationChoice[];
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  featured?: boolean;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  featured?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}


export interface ProductSummary {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  longDescription?: string | null;
  price: number;
  hasHalfOption?: boolean;
  halfPrice?: number | null;
  isAvailable: boolean;
  isActive?: boolean;
  isChefSpecial?: boolean;
  isRecommended?: boolean;
  cuisine: RegionalCuisine;
  isSpicy?: boolean;
  preparationTime?: string | null;
  serves?: string | null;
  customizationOptions?: CustomizationOption[] | null;
  imageUrl?: string | null;
  displayOrder?: number;
  category?: CategorySummary;
}

export interface CreateProductDto {
  categoryId: string;
  name: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  price: number;
  hasHalfOption?: boolean;
  halfPrice?: number | null;
  isAvailable?: boolean;
  isActive?: boolean;
  isChefSpecial?: boolean;
  isRecommended?: boolean;
  cuisine?: RegionalCuisine;
  isSpicy?: boolean;
  preparationTime?: string;
  serves?: string;
  customizationOptions?: CustomizationOption[];
  imageUrl?: string;
  displayOrder?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface MenuFilterQuery {
  category?: string;
  cuisine?: string;
  search?: string;
}

