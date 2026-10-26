import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { DriverStatus } from "../../../types";

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus, {
    message: "Status must be PENDING, ACTIVE, or SUSPENDED",
  })
  @IsNotEmpty()
  status!: DriverStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
