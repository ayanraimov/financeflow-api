import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import {
  AnalyticsPeriodDto,
  AnalyticsPeriod,
} from './dto/analytics-period.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { TrendsDto } from './dto/trends.dto';
import { ComparisonDto } from './dto/comparison.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
@Throttle({ analytics: { limit: 30, ttl: 60000 } })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Dashboard principal con métricas generales',
    description:
      'Retorna ingresos, gastos, ahorros, top categorías y transacciones recientes',
  })
  @ApiQuery({
    name: 'period',
    enum: ['WEEK', 'MONTH', 'YEAR', 'CUSTOM'],
    required: false,
  })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Overview obtenido exitosamente',
  })
  getOverview(
    @CurrentUser('sub') userId: string,
    @Query() query: AnalyticsPeriodDto,
  ) {
    const period = query.period ?? AnalyticsPeriod.MONTH;
    return this.analyticsService.getOverview(
      userId,
      period,
      query.date,
      query.startDate,
      query.endDate,
    );
  }

  @Get('spending')
  @ApiOperation({
    summary: 'Análisis detallado de gastos',
    description:
      'Retorna gastos por categoría, diarios, promedio y mayor gasto',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Análisis de gastos obtenido exitosamente',
  })
  getSpending(
    @CurrentUser('sub') userId: string,
    @Query() query: DateRangeDto,
  ) {
    return this.analyticsService.getSpending(
      userId,
      query.startDate,
      query.endDate,
    );
  }

  @Get('income')
  @ApiOperation({
    summary: 'Análisis detallado de ingresos',
    description:
      'Retorna ingresos por categoría, diarios, promedio y mayor ingreso',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Análisis de ingresos obtenido exitosamente',
  })
  getIncome(@CurrentUser('sub') userId: string, @Query() query: DateRangeDto) {
    return this.analyticsService.getIncome(
      userId,
      query.startDate,
      query.endDate,
    );
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Evolución temporal de finanzas',
    description: 'Retorna ingresos, gastos y ahorros por períodos históricos',
  })
  @ApiQuery({
    name: 'period',
    enum: ['WEEK', 'MONTH', 'YEAR'],
    required: false,
  })
  @ApiQuery({ name: 'intervals', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Tendencias obtenidas exitosamente',
  })
  getTrends(@CurrentUser('sub') userId: string, @Query() query: TrendsDto) {
    const period = query.period ?? AnalyticsPeriod.MONTH;
    const intervals = query.intervals ?? 6;
    return this.analyticsService.getTrends(userId, period, intervals);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Distribución de gastos por categorías',
    description: 'Retorna breakdown de gastos por categoría con porcentajes',
  })
  @ApiQuery({
    name: 'period',
    enum: ['WEEK', 'MONTH', 'YEAR'],
    required: false,
  })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Distribución de categorías obtenida exitosamente',
  })
  getCategoriesDistribution(
    @CurrentUser('sub') userId: string,
    @Query() query: AnalyticsPeriodDto,
  ) {
    const period = query.period ?? AnalyticsPeriod.MONTH;
    return this.analyticsService.getCategoriesDistribution(
      userId,
      period,
      query.date,
    );
  }

  @Get('comparison')
  @ApiOperation({
    summary: 'Comparación entre dos períodos',
    description:
      'Retorna diferencias y cambios porcentuales entre período actual y anterior',
  })
  @ApiQuery({ name: 'currentStart', required: true, type: String })
  @ApiQuery({ name: 'currentEnd', required: true, type: String })
  @ApiQuery({ name: 'previousStart', required: true, type: String })
  @ApiQuery({ name: 'previousEnd', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Comparación obtenida exitosamente',
  })
  getComparison(
    @CurrentUser('sub') userId: string,
    @Query() query: ComparisonDto,
  ) {
    return this.analyticsService.getComparison(
      userId,
      query.currentStart,
      query.currentEnd,
      query.previousStart,
      query.previousEnd,
    );
  }
}
