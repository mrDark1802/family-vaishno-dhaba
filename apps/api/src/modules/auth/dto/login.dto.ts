import { IsNotEmpty, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: "Mobile number or email is required" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  identifier: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  password: string;
}
