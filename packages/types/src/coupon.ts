export interface CouponSummary {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountType: "FLAT" | "PERCENT";
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  usageCount: number;
  maxUsage?: number | null;
  isActive: boolean;
  validUntil?: string | null;
  createdAt: string;
}

export interface CreateCouponDto {
  code: string;
  title: string;
  description?: string;
  discountType: "FLAT" | "PERCENT";
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  maxUsage?: number;
  isActive?: boolean;
  validUntil?: string;
}

export interface UpdateCouponDto extends Partial<CreateCouponDto> {}

export interface ValidateCouponDto {
  code: string;
  orderSubtotal: number;
}

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  discountAmount?: number;
  message?: string;
}
