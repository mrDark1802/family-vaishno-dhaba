import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class RecordLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty()
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}
