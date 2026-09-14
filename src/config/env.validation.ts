import { plainToInstance } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  API_PORT: number = 4000;

  @IsString()
  @IsOptional()
  DATABASE_URL: string =
    "postgresql://postgres:179aRCbqfJvRoWQA@db.opzfazaywmcsjxaemgkj.supabase.co:5432/postgres";

  @IsString()
  @IsOptional()
  JWT_SECRET: string =
    "fvd_secure_production_jwt_secret_2026_family_vaishno_dhaba_key";

  @IsString()
  @IsOptional()
  COOKIE_SECRET: string = "dev_cookie_secret";

  @IsString()
  @IsOptional()
  TOTP_ENCRYPTION_KEY: string =
    "fvd_totp_encryption_key_32_bytes_dev_2026_change_in_production_key!";

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = "http://localhost:3000,http://localhost:3001";

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL: number = 60;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 100;

  @IsString()
  @IsOptional()
  PAYMENT_PROVIDER: string = "razorpay";

  @IsString()
  @IsOptional()
  PAYMENT_WEBHOOK_SECRET: string = "dev_mock_webhook_secret_fvd_2026";

  @IsString()
  @IsOptional()
  PAYMENT_KEY_ID: string = "";

  @IsString()
  @IsOptional()
  PAYMENT_KEY_SECRET: string = "";

  @IsString()
  @IsOptional()
  RAZORPAY_KEY_ID: string = "";

  @IsString()
  @IsOptional()
  RAZORPAY_KEY_SECRET: string = "";

  @IsString()
  @IsOptional()
  RAZORPAY_WEBHOOK_SECRET: string = "";

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID: string = "";

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET: string = "";

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL: string =
    "https://family-vaishno-dhaba.vercel.app/api/auth/google/callback";
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }
  return validatedConfig;
}
