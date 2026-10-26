import { IsEnum, IsNotEmpty } from "class-validator";
import { DriverAvailability } from "../../../types";

export class UpdateAvailabilityDto {
  @IsEnum(DriverAvailability, {
    message: "Availability must be ONLINE, OFFLINE, or BUSY",
  })
  @IsNotEmpty()
  availability!: DriverAvailability;
}
