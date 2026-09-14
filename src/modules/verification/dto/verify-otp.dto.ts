import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty({ message: "Phone number is required" })
  @Matches(/^(\+91)?[6-9]\d{9}$/, {
    message: "Phone number must be a valid 10-digit Indian mobile number",
  })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: "Verification code is required" })
  @Length(6, 6, { message: "Verification code must be 6 digits" })
  @Matches(/^\d{6}$/, { message: "Verification code must contain only numbers" })
  otp!: string;
}
