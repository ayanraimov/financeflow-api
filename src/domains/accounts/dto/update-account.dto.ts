import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    example: 'Cuenta Ahorro BBVA',
    description: 'Nombre de la cuenta',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '#FF6B6B',
    description: 'Color para la cuenta',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: '🏦',
    description: 'Icono emoji para la cuenta',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'Moneda de la cuenta',
  })
  @IsOptional()
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'JPY', 'MXN'])
  currency?: string;
}
