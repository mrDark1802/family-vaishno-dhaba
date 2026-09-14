import { IsNotEmpty, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class Verify2FARecoveryDto {
  @IsString()
  @IsNotEmpty({ message: "Authentication challenge is required" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  challenge: string;

  @IsString()
  @IsNotEmpty({ message: "Recovery code is required" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  recoveryCode: string;
}
