import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum AnalyticsPeriod {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export class AnalyticsPeriodDto {
  @ApiProperty({
    description: 'Período de análisis',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.MONTH,
    required: false,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod, { message: 'Período inválido' })
  period?: AnalyticsPeriod = AnalyticsPeriod.MONTH;

  @ApiProperty({
    description: 'Fecha de referencia (default: hoy)',
    example: '2024-12-04T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'date debe ser una fecha ISO válida' })
  date?: string;
}
