import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { DeliveryStatus } from "../../../types";

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatus, {
    message: "Invalid delivery status",
  })
  @IsNotEmpty()
  status!: DeliveryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cancellationReason?: string;
}
