import { IsNotEmpty, IsString, Matches } from "class-validator";
import { Transform } from "class-transformer";

export class RegenerateRecoveryCodesDto {
  @IsString()
  @IsNotEmpty({ message: "Current password is required" })
  password: string;

  @IsString()
  @IsNotEmpty({ message: "Current 6-digit authenticator code is required" })
  @Matches(/^\d{6}$/, {
    message: "Authenticator code must be exactly 6 digits",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  code: string;
}
