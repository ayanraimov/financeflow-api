import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({
    example: 'Cuenta Corriente BBVA',
    description: 'Nombre de la cuenta',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'BANK',
    description: 'Tipo de cuenta',
    enum: AccountType,
  })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({
    example: 1500.50,
    description: 'Balance inicial de la cuenta',
  })
  @IsNumber()
  @Min(0)
  initialBalance: number;

  @ApiProperty({
    example: 'EUR',
    description: 'Moneda de la cuenta',
    default: 'EUR',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['EUR', 'USD', 'GBP', 'JPY', 'MXN'])
  currency?: string;

  @ApiProperty({
    example: '#4ECDC4',
    description: 'Color para la cuenta (hexadecimal)',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    example: '💳',
    description: 'Icono emoji para la cuenta',
    required: false,
  })
  @IsOptional()
  @IsString()
  icon?: string;
}
