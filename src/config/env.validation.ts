import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUrl,
  validateSync,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  APP_NAME: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  FRONTEND_URL: string;

  @IsString()
  MOBILE_APP_SCHEME: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsBoolean()
  DB_SSL: boolean;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRES: string;

  @IsString()
  JWT_REFRESH_EXPIRES: string;

  @IsUrl({ require_tld: false })
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsString()
  SUPABASE_SERVICE_KEY: string;

  @IsString()
  SUPABASE_STORAGE_BUCKET: string;

  @IsString()
  MAIL_HOST: string;

  @IsNumber()
  MAIL_PORT: number;

  @IsBoolean()
  MAIL_SECURE: boolean;

  @IsString()
  MAIL_USER: string;

  @IsString()
  MAIL_PASSWORD: string;

  @IsString()
  MAIL_FROM: string;

  @IsOptional()
  @IsString()
  FAST2SMS_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  RAZORPAY_KEY_ID: string;

  @IsString()
  @IsNotEmpty()
  RAZORPAY_KEY_SECRET: string;

  @IsString()
  @IsNotEmpty()
  RAZORPAY_WEBHOOK_SECRET: string;

  @IsNumber()
  THROTTLE_TTL: number;

  @IsNumber()
  THROTTLE_LIMIT: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  OTP_EXPIRY_MINUTES: number = 10;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  OTP_LENGTH: number = 6;
}

export function validate(config: Record<string, any>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
