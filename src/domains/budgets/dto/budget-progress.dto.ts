import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriod } from '@prisma/client';

class CategorySummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Groceries' })
  name: string;

  @ApiProperty({ example: '🛒' })
  icon: string;

  @ApiProperty({ example: '#4CAF50' })
  color: string;
}

export class BudgetProgressDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  budgetId: string;

  @ApiProperty({ example: 'Groceries Budget December' })
  budgetName: string;

  @ApiProperty({ type: CategorySummaryDto })
  category: CategorySummaryDto;

  @ApiProperty({ example: 500.0, description: 'Monto del presupuesto' })
  amount: number;

  @ApiProperty({ example: 320.5, description: 'Monto gastado' })
  spent: number;

  @ApiProperty({ example: 179.5, description: 'Monto restante' })
  remaining: number;

  @ApiProperty({
    example: 64.1,
    description: 'Porcentaje usado (puede ser > 100)',
  })
  percentageUsed: number;

  @ApiProperty({
    example: false,
    description: 'Indica si se excedió el presupuesto',
  })
  isOverBudget: boolean;

  @ApiProperty({
    example: false,
    description: 'Indica si se debe alertar (>= alertThreshold)',
  })
  shouldAlert: boolean;

  @ApiProperty({ enum: BudgetPeriod, example: 'MONTHLY' })
  period: BudgetPeriod;

  @ApiProperty({ example: '2024-12-01T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  endDate: Date;

  @ApiProperty({
    example: 15,
    description: 'Días restantes hasta finalizar el período',
  })
  daysRemaining: number;

  @ApiProperty({ example: 80 })
  alertThreshold: number;
}
