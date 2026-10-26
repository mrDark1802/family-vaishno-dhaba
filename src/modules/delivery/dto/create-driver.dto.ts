import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty({ message: "Driver full name is required" })
  @MinLength(2, { message: "Name must be at least 2 characters" })
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: "Mobile number is required" })
  @MinLength(10, { message: "Phone number must be at least 10 digits" })
  @MaxLength(15)
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: "Please enter a valid email address" })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  password?: string;

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
