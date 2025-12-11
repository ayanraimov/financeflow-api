import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { IsValidDateRange } from '../../../core/validators/date-range.validator';

export enum AnalyticsPeriod {
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM',
}

export class AnalyticsPeriodDto {
  @ApiPropertyOptional({
    description: 'Predefined period or custom',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.MONTH,
    example: 'month',
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod, {
    message:
      'Period must be a valid analytics period (week, month, year, custom)',
  })
  period?: AnalyticsPeriod = AnalyticsPeriod.MONTH;

  @ApiPropertyOptional({
    description: 'Reference date for period calculation (ISO 8601)',
    example: '2025-12-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date' })
  date?: string;

  @ApiPropertyOptional({
    description:
      'Start date for custom period (ISO 8601). Required if period is "custom"',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date' })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'End date for custom period (ISO 8601). Required if period is "custom". Maximum range: 1 year',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date' })
  @IsValidDateRange({
    message:
      'El rango de fechas no puede exceder 1 año y la fecha final debe ser posterior a la inicial',
  })
  endDate?: string;
}
