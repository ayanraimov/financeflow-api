import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { Validate } from 'class-validator';
import { IsNotFutureDate } from '../../../core/validators/is-not-future-date.validator';

export class DateRangeDto {
  @ApiProperty({
    description: 'Fecha de inicio',
    example: '2024-11-01T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'startDate debe ser una fecha ISO válida' })
  @Validate(IsNotFutureDate, {
    message: 'La fecha de inicio no puede ser futura',
  })
  startDate: string;

  @ApiProperty({
    description: 'Fecha de fin',
    example: '2024-11-30T23:59:59.999Z',
  })
  @IsDateString({}, { message: 'endDate debe ser una fecha ISO válida' })
  @Validate(IsNotFutureDate, { message: 'La fecha de fin no puede ser futura' })
  endDate: string;
}
