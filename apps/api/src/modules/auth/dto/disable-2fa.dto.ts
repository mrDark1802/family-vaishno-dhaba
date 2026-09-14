import { IsNotEmpty, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class Disable2FADto {
  @IsString()
  @IsNotEmpty({ message: "Current password is required" })
  password: string;

  @IsString()
  @IsNotEmpty({ message: "Current TOTP code or recovery code is required" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  code: string;
}
