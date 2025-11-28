import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email único del usuario',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede exceder 50 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres' })
  lastName: string;
}
