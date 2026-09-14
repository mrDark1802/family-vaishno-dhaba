import { IsNotEmpty, IsString, Matches } from "class-validator";
import { Transform } from "class-transformer";

export class Verify2FALoginDto {
  @IsString()
  @IsNotEmpty({ message: "Authentication challenge is required" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  challenge: string;

  @IsString()
  @IsNotEmpty({ message: "6-digit authentication code is required" })
  @Matches(/^\d{6}$/, {
    message: "Authentication code must be exactly 6 digits",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  code: string;
}
