import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
  IsEmail,
} from "class-validator";
import { Type } from "class-transformer";
import { OrderType, PaymentMethod } from "../../../types";

import { PortionOption } from "../../../types";

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  @IsOptional()
  @IsEnum(["HALF", "FULL"], {
    message: "Portion must be either HALF or FULL",
  })
  portion?: PortionOption;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Order must contain at least one item" })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsEnum(OrderType, {
    message: "orderType must be either DELIVERY or TAKEAWAY",
  })
  orderType!: OrderType;

  @IsString()
  @IsNotEmpty({ message: "Customer name is required" })
  @MinLength(2, { message: "Customer name must be at least 2 characters" })
  @MaxLength(100, { message: "Customer name must be at most 100 characters" })
  customerName!: string;

  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, {
    message: "Customer phone must be a valid 10-digit Indian mobile number",
  })
  customerPhone!: string;

  @IsOptional()
  @IsEmail({}, { message: "Please provide a valid email address" })
  @MaxLength(150)
  customerEmail?: string;

  @ValidateIf((o) => o.orderType === OrderType.DELIVERY)
  @IsString({ message: "Delivery address is required for delivery orders" })
  @IsNotEmpty({
    message: "Delivery address cannot be empty for delivery orders",
  })
  @MinLength(5, { message: "Please provide complete street address" })
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  landmark?: string;

  @ValidateIf((o) => o.orderType === OrderType.DELIVERY)
  @IsString({ message: "City is required for delivery orders" })
  @IsNotEmpty({ message: "City is required for delivery orders" })
  city?: string;

  @ValidateIf((o) => o.orderType === OrderType.DELIVERY)
  @IsString({ message: "Pincode is required for delivery orders" })
  @Matches(/^\d{6}$/, {
    message: "Postal PIN code must be a 6-digit number",
  })
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: "Special instructions cannot exceed 200 characters",
  })
  notes?: string;

  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: "Invalid payment method",
  })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString({ message: "Coupon code must be a string" })
  @MaxLength(30)
  couponCode?: string;

  @IsOptional()
  @IsString({ message: "Phone verification token must be a string" })
  phoneVerificationToken?: string;
}
