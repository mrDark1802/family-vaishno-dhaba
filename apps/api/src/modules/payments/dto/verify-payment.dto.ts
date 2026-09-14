import { IsNotEmpty, IsOptional, IsString, IsObject } from "class-validator";

export class VerifyPaymentDto {
  @IsNotEmpty({ message: "Payment ID is required." })
  @IsString({ message: "Payment ID must be a string." })
  paymentId!: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  providerOrderId?: string;

  @IsOptional()
  @IsString()
  providerSignature?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
