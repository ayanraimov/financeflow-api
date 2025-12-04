import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {
  @ApiProperty({
    description: 'Estado activo del presupuesto',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive?: boolean;
}
