import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "Label cannot exceed 50 characters" })
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Recipient name must be at least 2 characters" })
  @MaxLength(100, { message: "Recipient name cannot exceed 100 characters" })
  recipientName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, {
    message: "Phone number must be a valid 10-digit Indian mobile number",
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: "Street address must be at least 5 characters" })
  @MaxLength(255, { message: "Street address cannot exceed 255 characters" })
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "House/Flat detail cannot exceed 100 characters" })
  house?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "Landmark cannot exceed 100 characters" })
  landmark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: "Postal PIN code must be a 6-digit number",
  })
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
