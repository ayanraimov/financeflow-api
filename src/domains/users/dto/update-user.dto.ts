import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  IsIn,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Pérez García',
    description: 'Apellido del usuario',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'https://i.pravatar.cc/150?img=12',
    description: 'URL del avatar',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Debe proporcionar una URL válida para el avatar' })
  avatar?: string;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'Moneda por defecto (EUR, USD, GBP)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['EUR', 'USD', 'GBP', 'JPY', 'MXN'], {
    message: 'Moneda debe ser EUR, USD, GBP, JPY o MXN',
  })
  defaultCurrency?: string;
}
