import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  IsDateString,
  IsOptional,
  IsBoolean,
  Validate,
} from 'class-validator';
import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsNotFutureDate } from '../validators/is-not-future-date.validator';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Account ID where transaction occurs',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4')
  accountId: string;

  @ApiProperty({
    description: 'Category ID for transaction classification',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID('4')
  categoryId: string;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: 'EXPENSE',
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: 'Transaction amount (always positive, type determines sign)',
    example: 50.99,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Grocery shopping at Walmart',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Transaction date (ISO 8601 format, cannot be future)',
    example: '2025-11-30T18:00:00Z',
  })
  @IsDateString()
  @Validate(IsNotFutureDate) // ⚡ Custom validator
  date: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Paid with credit card',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    description: 'Is this a recurring transaction?',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
