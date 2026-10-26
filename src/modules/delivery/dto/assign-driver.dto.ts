import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class AssignDriverDto {
  @IsString()
  @IsNotEmpty({ message: "Order ID is required" })
  orderId!: string;

  @IsString()
  @IsNotEmpty({ message: "Driver ID is required" })
  driverId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class ReassignDriverDto {
  @IsString()
  @IsNotEmpty({ message: "Order ID is required" })
  orderId!: string;

  @IsString()
  @IsNotEmpty({ message: "New Driver ID is required" })
  newDriverId!: string;

  @IsString()
  @IsNotEmpty({ message: "Reassignment reason is required" })
  @MaxLength(255)
  reason!: string;
}
