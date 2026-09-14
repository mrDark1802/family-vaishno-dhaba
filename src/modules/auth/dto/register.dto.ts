import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @Length(2, 100, { message: "Name must be between 2 and 100 characters" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name: string;

  @IsString()
  @IsNotEmpty({ message: "Phone number is required" })
  @Matches(/^(\+91)?[6-9]\d{9}$/, {
    message: "Please provide a valid 10-digit Indian mobile number",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().replace(/[\s-]/g, "") : value,
  )
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @Length(8, 128, { message: "Password must be at least 8 characters long" })
  password: string;
}
