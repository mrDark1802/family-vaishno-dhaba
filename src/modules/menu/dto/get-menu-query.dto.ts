import { IsEnum, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { RegionalCuisine } from "@prisma/client";

export class GetMenuQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

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
}
