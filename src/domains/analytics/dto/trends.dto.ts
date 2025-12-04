import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { AnalyticsPeriod } from './analytics-period.dto';

export class TrendsDto {
  @ApiProperty({
    description: 'Período de cada intervalo',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.MONTH,
    required: false,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod, { message: 'Período inválido' })
  period?: AnalyticsPeriod = AnalyticsPeriod.MONTH;

  @ApiProperty({
    description: 'Número de intervalos a mostrar',
    example: 6,
    minimum: 2,
    maximum: 24,
    default: 6,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'intervals debe ser un número entero' })
  @Min(2, { message: 'Mínimo 2 intervalos' })
  @Max(24, { message: 'Máximo 24 intervalos' })
  @Type(() => Number)
  intervals?: number = 6;
}
