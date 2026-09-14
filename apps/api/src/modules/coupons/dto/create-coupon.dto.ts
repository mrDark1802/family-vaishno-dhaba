import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  IsBoolean,
  IsDateString,
} from "class-validator";

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(["FLAT", "PERCENT"])
  discountType: "FLAT" | "PERCENT";

  @IsNumber()
  @Min(1)
  value: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxDiscount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsage?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
  orderSubtotal: number;
}
