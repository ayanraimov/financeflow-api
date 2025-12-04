import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Streaming Services',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'Category type',
    enum: CategoryType,
    example: 'EXPENSE',
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiProperty({
    description: 'Category icon (emoji)',
    example: '📺',
    required: false,
    default: '📁',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @ApiProperty({
    description: 'Category color (hex format)',
    example: '#FF5733',
    required: false,
    default: '#4ECDC4',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #FF5733)',
  })
  color?: string;
}
