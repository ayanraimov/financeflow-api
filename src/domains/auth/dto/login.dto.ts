import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña del usuario',
  })
  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  password: string;
}
