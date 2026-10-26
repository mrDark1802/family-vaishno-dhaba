import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class ActivateDriverDto {
  @IsString()
  @IsNotEmpty({ message: "User ID is required" })
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleType?: string; // "BIKE" | "SCOOTER" | "CAR" | "OTHER"

  @IsOptional()
  @IsString()
  @MaxLength(30)
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  licenseNumber?: string;
}
