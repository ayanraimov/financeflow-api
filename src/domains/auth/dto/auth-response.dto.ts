import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de acceso JWT (válido 15 minutos)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de refresco (válido 7 días)',
  })
  refreshToken: string;

  @ApiProperty({
    example: {
      id: 'uuid-here',
      email: 'juan.perez@example.com',
      firstName: 'Juan',
      lastName: 'Pérez',
    },
    description: 'Datos del usuario autenticado',
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}
