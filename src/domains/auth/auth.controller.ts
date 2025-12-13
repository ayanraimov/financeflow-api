import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as ApiSwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiResponse } from '../../core/http/api-response';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiSwaggerResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    type: AuthResponseDto,
  })
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponse<AuthResponseDto>> {
    const result = await this.authService.register(registerDto);
    return { success: true, data: result };
  }

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Login exitoso',
    type: AuthResponseDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<AuthResponseDto>> {
    const result = await this.authService.login(loginDto);
    return { success: true, data: result };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'Refrescar tokens de acceso' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Tokens refrescados exitosamente',
    type: AuthResponseDto,
  })
  async refreshTokens(
    @GetUser('sub') userId: string,
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponse<AuthResponseDto>> {
    const result = await this.authService.refreshTokens(userId, refreshTokenDto.refreshToken);
    return { success: true, data: result };
  }

  @Post('logout')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiSwaggerResponse({ status: 200, description: 'Logout exitoso' })
  async logout(@GetUser('id') userId: string): Promise<ApiResponse<{ message: string }>> {
    await this.authService.logout(userId);
    return { success: true, data: { message: 'Logout exitoso' } };
  }
}
