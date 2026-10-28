import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class PhoneLoginDto {
  @IsString()
  @IsNotEmpty({ message: "Mobile number is required" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  otp?: string;
}
