import { IsNotEmpty, IsString } from "class-validator";

export class CreatePaymentDto {
  @IsNotEmpty({ message: "Order ID is required to initiate payment." })
  @IsString({ message: "Order ID must be a string." })
  orderId!: string;
}
