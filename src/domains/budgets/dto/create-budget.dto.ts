import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDateString,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetPeriod } from '@prisma/client';
import { IsNotFutureDate } from '../../../core/validators/is-not-future-date.validator';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'ID de la categoría para el presupuesto',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'categoryId debe ser un UUID válido' })
  categoryId: string;

  @ApiProperty({
    description: 'Nombre descriptivo del presupuesto',
    example: 'Groceries Budget December',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Monto del presupuesto (máximo 2 decimales)',
    example: 500.0,
    minimum: 0.01,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe tener máximo 2 decimales' },
  )
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Período del presupuesto',
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
  })
  @IsEnum(BudgetPeriod, { message: 'Período inválido' })
  period: BudgetPeriod;

  @ApiProperty({
    description: 'Fecha de inicio (opcional, default: hoy)',
    example: '2024-12-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate debe ser una fecha ISO válida' })
  @Validate(IsNotFutureDate, {
    message: 'La fecha de inicio no puede ser futura',
  })
  startDate?: string;

  @ApiProperty({
    description: 'Umbral de alerta en porcentaje (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
    default: 80,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'alertThreshold debe ser un número entero' })
  @Min(0, { message: 'alertThreshold debe ser al menos 0' })
  @Max(100, { message: 'alertThreshold no puede exceder 100' })
  @Type(() => Number)
  alertThreshold?: number;
}
