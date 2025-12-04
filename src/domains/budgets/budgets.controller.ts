import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetFiltersDto } from './dto/budget-filters.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo presupuesto' })
  @ApiResponse({
    status: 201,
    description: 'Presupuesto creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Presupuesto superpuesto' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() createBudgetDto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(userId, createBudgetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar presupuestos con filtros y paginación' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'period', required: false, enum: ['WEEKLY', 'MONTHLY', 'YEARLY'] })
  @ApiResponse({
    status: 200,
    description: 'Lista de presupuestos obtenida exitosamente',
  })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() filters: BudgetFiltersDto,
  ) {
    return this.budgetsService.findAll(userId, filters);
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Dashboard de todos los presupuestos activos con progreso',
  })
  @ApiResponse({
    status: 200,
    description: 'Overview obtenido exitosamente',
  })
  getOverview(@CurrentUser('sub') userId: string) {
    return this.budgetsService.getOverview(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un presupuesto' })
  @ApiResponse({
    status: 200,
    description: 'Presupuesto obtenido exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.findOne(userId, id);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Obtener progreso del presupuesto vs gasto actual' })
  @ApiResponse({
    status: 200,
    description: 'Progreso calculado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  getProgress(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.getProgress(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un presupuesto' })
  @ApiResponse({
    status: 200,
    description: 'Presupuesto actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  @ApiResponse({ status: 409, description: 'Presupuesto superpuesto' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(userId, id, updateBudgetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un presupuesto (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Presupuesto eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Presupuesto no encontrado' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.remove(userId, id);
  }
}
