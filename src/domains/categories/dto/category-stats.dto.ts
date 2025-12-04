import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum StatsPeriod {
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  ALL = 'ALL',
  CUSTOM = 'CUSTOM',
}

export class CategoryStatsDto {
  @ApiPropertyOptional({
    description: 'Stats period',
    enum: StatsPeriod,
    example: 'MONTH',
    default: 'ALL',
  })
  @IsOptional()
  @IsEnum(StatsPeriod)
  period?: StatsPeriod = StatsPeriod.ALL;

  @ApiPropertyOptional({
    description: 'Custom start date (required if period is CUSTOM)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (required if period is CUSTOM)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
