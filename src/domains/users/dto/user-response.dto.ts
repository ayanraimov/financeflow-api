import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    example: 'uuid-here',
    description: 'ID único del usuario',
  })
  id: string;

  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email del usuario',
  })
  email: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  lastName: string;

  @ApiProperty({
    example: 'https://i.pravatar.cc/150?img=12',
    description: 'URL del avatar',
    nullable: true,
  })
  avatar: string | null;

  @ApiProperty({
    example: 'EUR',
    description: 'Moneda por defecto del usuario',
  })
  defaultCurrency: string;

  @ApiProperty({
    example: false,
    description: 'Email verificado',
  })
  emailVerified: boolean;

  @ApiProperty({
    example: '2024-11-28T19:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @Exclude()
  password: string;

  @Exclude()
  refreshToken: string | null;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
