import { ApiProperty } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty({
    example: 'uuid-here',
    description: 'ID de la cuenta',
  })
  id: string;

  @ApiProperty({
    example: 'Cuenta Corriente BBVA',
    description: 'Nombre de la cuenta',
  })
  name: string;

  @ApiProperty({
    example: 'BANK',
    description: 'Tipo de cuenta',
  })
  type: string;

  @ApiProperty({
    example: 1500.5,
    description: 'Balance actual',
  })
  balance: number;

  @ApiProperty({
    example: 'EUR',
    description: 'Moneda',
  })
  currency: string;

  @ApiProperty({
    example: '#4ECDC4',
    description: 'Color',
  })
  color: string;

  @ApiProperty({
    example: '💳',
    description: 'Icono',
  })
  icon: string;

  @ApiProperty({
    example: true,
    description: 'Cuenta activa',
  })
  isActive: boolean;

  @ApiProperty({
    example: '2025-11-29T14:30:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-11-29T14:30:00.000Z',
    description: 'Última actualización',
  })
  updatedAt: Date;

  @ApiProperty({
    example: 'user-uuid',
    description: 'ID del usuario propietario',
  })
  userId: string;
}
