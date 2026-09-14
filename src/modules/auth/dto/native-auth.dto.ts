import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class NativeGoogleAuthDto {
  @IsString()
  @IsNotEmpty({ message: "Google ID Token is required" })
  idToken!: string;
}

export class NativeAppleAuthDto {
  @IsString()
  @IsNotEmpty({ message: "Apple Identity Token is required" })
  identityToken!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
