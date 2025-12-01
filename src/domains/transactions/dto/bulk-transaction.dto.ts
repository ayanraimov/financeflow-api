import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { CreateTransactionDto } from './create-transaction.dto';

export class BulkTransactionDto {
  @ApiProperty({
    description: 'Array of transactions to create (max 100)',
    type: [CreateTransactionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionDto)
  @ArrayMaxSize(100, { message: 'Maximum 100 transactions per bulk operation' })
  transactions: CreateTransactionDto[];
}
