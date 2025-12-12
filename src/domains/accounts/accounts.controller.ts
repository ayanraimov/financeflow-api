import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto, AccountResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/decorators/get-user.decorator';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva cuenta' })
  @ApiResponse({
    status: 201,
    description: 'Cuenta creada exitosamente',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(
    @GetUser('id') userId: string,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.create(userId, createAccountDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener todas las cuentas del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cuentas',
    type: [AccountResponseDto],
  })
  findAll(@GetUser('id') userId: string): Promise<AccountResponseDto[]> {
    return this.accountsService.findAll(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener una cuenta específica' })
  @ApiResponse({
    status: 200,
    description: 'Cuenta encontrada',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a esta cuenta' })
  findOne(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.findOne(id, userId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una cuenta' })
  @ApiResponse({
    status: 200,
    description: 'Cuenta actualizada',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.update(id, userId, updateAccountDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una cuenta' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  remove(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ): Promise<{ message: string }> {
    return this.accountsService.remove(id, userId);
  }
}
