import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { Validate } from 'class-validator';
import { IsNotFutureDate } from '../../../core/validators/is-not-future-date.validator';

export class ComparisonDto {
  @ApiProperty({
    description: 'Fecha inicio período actual',
    example: '2024-12-01T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'currentStart debe ser una fecha ISO válida' })
  @Validate(IsNotFutureDate)
  currentStart: string;

  @ApiProperty({
    description: 'Fecha fin período actual',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsDateString({}, { message: 'currentEnd debe ser una fecha ISO válida' })
  @Validate(IsNotFutureDate)
  currentEnd: string;

  @ApiProperty({
    description: 'Fecha inicio período anterior',
    example: '2024-11-01T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'previousStart debe ser una fecha ISO válida' })
  @Validate(IsNotFutureDate)
  previousStart: string;

  @ApiProperty({
    description: 'Fecha fin período anterior',
    example: '2024-11-30T23:59:59.999Z',
  })
  @IsDateString({}, { message: 'previousEnd debe ser una fecha ISO válida' })
  @Validate(IsNotFutureDate)
  previousEnd: string;
}
