import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, validateSync, IsEnum } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRATION: string;

  @IsString()
  JWT_REFRESH_EXPIRATION: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsNumber()
  THROTTLE_TTL: number;

  @IsNumber()
  THROTTLE_LIMIT: number;
}

export function validate(config: Record<string, unknown>) {
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
