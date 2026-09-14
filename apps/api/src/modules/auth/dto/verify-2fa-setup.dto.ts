import { IsNotEmpty, IsString, Matches } from "class-validator";
import { Transform } from "class-transformer";

export class Verify2FASetupDto {
  @IsString()
  @IsNotEmpty({ message: "Verification code is required" })
  @Matches(/^\d{6}$/, { message: "Verification code must be exactly 6 digits" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  code: string;
}
