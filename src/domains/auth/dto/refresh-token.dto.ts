import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de refresco válido',
  })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es requerido' })
  refreshToken: string;
}
