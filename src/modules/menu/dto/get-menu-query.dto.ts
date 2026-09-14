import { IsEnum, IsOptional, IsString, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";
import { RegionalCuisine } from "@prisma/client";

export class GetMenuQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.toUpperCase() : value,
  )
  @IsEnum(RegionalCuisine, {
    message:
      "cuisine must be one of PUNJABI, HIMACHALI, COMMON (case-insensitive)",
  })
  cuisine?: RegionalCuisine;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === 1 || value === "1")
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === 1 || value === "1")
  @IsBoolean()
  isRecommended?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === 1 || value === "1")
  @IsBoolean()
  isBestseller?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === 1 || value === "1")
  @IsBoolean()
  isChefSpecial?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : undefined))
  limit?: number;
}

