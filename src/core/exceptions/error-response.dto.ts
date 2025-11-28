import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    example: false,
    description: 'Indica si la operación fue exitosa',
  })
  success: boolean;

  @ApiProperty({
    example: 404,
    description: 'Código de estado HTTP',
  })
  statusCode: number;

  @ApiProperty({
    example: '2025-11-28T20:45:00.000Z',
    description: 'Timestamp del error',
  })
  timestamp: string;

  @ApiProperty({
    example: '/api/v1/users/me',
    description: 'Ruta donde ocurrió el error',
  })
  path: string;

  @ApiProperty({
    example: 'GET',
    description: 'Método HTTP',
  })
  method: string;

  @ApiProperty({
    example: 'Usuario no encontrado',
    description: 'Mensaje descriptivo del error',
  })
  message: string;

  @ApiProperty({
    example: 'Not Found',
    description: 'Tipo de error',
  })
  error: string;
}
