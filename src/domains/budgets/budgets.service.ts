import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetFiltersDto } from './dto/budget-filters.dto';
import { BudgetProgressDto } from './dto/budget-progress.dto';
import { BudgetPeriod, TransactionType, Prisma } from '@prisma/client';
import { addDays, addMonths, addYears, differenceInDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';
import { CacheInvalidationService } from '../../core/services/cache-invalidation.service';

type BudgetWithCategory = Prisma.BudgetGetPayload<{
  include: {
    category: { select: { id: true; name: true; icon: true; color: true } };
  };
}>;

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async create(userId: string, createBudgetDto: CreateBudgetDto) {
    this.logger.log(`Creating budget for user ${userId}`);

    // Validar que la categoría existe y pertenece al usuario (o es default)
    const category = await this.prisma.category.findFirst({
      where: {
        id: createBudgetDto.categoryId,
        OR: [{ userId }, { isDefault: true }],
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Categoría no encontrada o no tienes acceso a ella',
      );
    }

    // Validar que la categoría es de tipo EXPENSE
    if (category.type !== TransactionType.EXPENSE) {
      throw new BadRequestException(
        'Solo puedes crear presupuestos para categorías de tipo EXPENSE',
      );
    }

    // Calcular fechas
    const startDate = createBudgetDto.startDate
      ? new Date(createBudgetDto.startDate)
      : new Date();
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = this.calculateEndDate(startDate, createBudgetDto.period);

    // Verificar que no hay budgets activos superpuestos para la misma categoría
    await this.checkOverlappingBudgets(
      userId,
      createBudgetDto.categoryId,
      startDate,
      endDate,
    );

    // Crear budget
    const budget = await this.prisma.budget.create({
      data: {
        userId,
        categoryId: createBudgetDto.categoryId,
        name: createBudgetDto.name,
        amount: new Decimal(createBudgetDto.amount),
        period: createBudgetDto.period,
        startDate,
        endDate,
        alertThreshold: createBudgetDto.alertThreshold ?? 80,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    this.logger.log(`Budget created successfully: ${budget.id}`);

    await this.cacheInvalidation.invalidateBudgets(userId);
    return {
      success: true,
      data: this.formatBudgetResponse(budget),
      message: 'Presupuesto creado exitosamente',
    };
  }

  async findAll(userId: string, filters: BudgetFiltersDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BudgetWhereInput = { userId };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.period) {
      where.period = filters.period;
    }

    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.budget.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: budgets.map((b) => this.formatBudgetResponse(b)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    return {
      success: true,
      data: this.formatBudgetResponse(budget),
    };
  }

  async update(userId: string, id: string, updateBudgetDto: UpdateBudgetDto) {
    this.logger.log(`Updating budget ${id} for user ${userId}`);

    // Verificar ownership
    const existingBudget = await this.prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!existingBudget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    // Si se actualiza categoryId, validar
    if (updateBudgetDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: updateBudgetDto.categoryId,
          OR: [{ userId }, { isDefault: true }],
        },
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      if (category.type !== TransactionType.EXPENSE) {
        throw new BadRequestException(
          'Solo puedes crear presupuestos para categorías de tipo EXPENSE',
        );
      }
    }

    // Recalcular endDate si se modifica startDate o period
    let endDate = existingBudget.endDate;
    if (updateBudgetDto.startDate || updateBudgetDto.period) {
      const startDate = updateBudgetDto.startDate
        ? new Date(updateBudgetDto.startDate)
        : existingBudget.startDate;
      startDate.setUTCHours(0, 0, 0, 0);

      const period = updateBudgetDto.period || existingBudget.period;
      endDate = this.calculateEndDate(startDate, period);
    }

    // Verificar overlapping si cambian fechas o categoría
    if (
      updateBudgetDto.categoryId ||
      updateBudgetDto.startDate ||
      updateBudgetDto.period
    ) {
      const startDate = updateBudgetDto.startDate
        ? new Date(updateBudgetDto.startDate)
        : existingBudget.startDate;

      await this.checkOverlappingBudgets(
        userId,
        updateBudgetDto.categoryId || existingBudget.categoryId,
        startDate,
        endDate,
        id,
      );
    }

    const budget = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(updateBudgetDto.categoryId && {
          categoryId: updateBudgetDto.categoryId,
        }),
        ...(updateBudgetDto.name && { name: updateBudgetDto.name }),
        ...(updateBudgetDto.amount !== undefined && {
          amount: new Decimal(updateBudgetDto.amount),
        }),
        ...(updateBudgetDto.period && { period: updateBudgetDto.period }),
        ...(updateBudgetDto.startDate && {
          startDate: new Date(updateBudgetDto.startDate),
        }),
        ...(updateBudgetDto.alertThreshold !== undefined && {
          alertThreshold: updateBudgetDto.alertThreshold,
        }),
        ...(updateBudgetDto.isActive !== undefined && {
          isActive: updateBudgetDto.isActive,
        }),
        endDate,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    this.logger.log(`Budget ${id} updated successfully`);

    await this.cacheInvalidation.invalidateBudgets(userId);
    return {
      success: true,
      data: this.formatBudgetResponse(budget),
      message: 'Presupuesto actualizado exitosamente',
    };
  }

  async remove(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
    });

    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    await this.prisma.budget.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Budget ${id} deleted (soft) successfully`);

    await this.cacheInvalidation.invalidateBudgets(userId);
    return {
      success: true,
      message: 'Presupuesto eliminado exitosamente',
    };
  }

  async getProgress(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; data: BudgetProgressDto }> {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Presupuesto no encontrado');
    }

    const progress = await this.calculateProgress(budget, userId);

    return {
      success: true,
      data: progress,
    };
  }

  async getOverview(userId: string) {
    this.logger.log(`Getting budgets overview for user ${userId}`);

    const activeBudgets = await this.prisma.budget.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    // Calcular progress para cada budget
    const budgetsWithProgress = await Promise.all(
      activeBudgets.map((budget) => this.calculateProgress(budget, userId)),
    );

    // Ordenar por: próximos a vencer primero, luego por percentageUsed descendente
    const sorted = budgetsWithProgress.sort((a, b) => {
      if (a.daysRemaining !== b.daysRemaining) {
        return a.daysRemaining - b.daysRemaining;
      }
      return b.percentageUsed - a.percentageUsed;
    });

    return {
      success: true,
      data: sorted,
    };
  }

  // ==================== HELPER METHODS ====================

  private calculateEndDate(startDate: Date, period: BudgetPeriod): Date {
    const start = new Date(startDate);

    switch (period) {
      case BudgetPeriod.WEEKLY:
        return addDays(start, 7);
      case BudgetPeriod.MONTHLY:
        return addMonths(start, 1);
      case BudgetPeriod.YEARLY:
        return addYears(start, 1);
      default:
        throw new BadRequestException('Período inválido');
    }
  }

  private async checkOverlappingBudgets(
    userId: string,
    categoryId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.BudgetWhereInput = {
      userId,
      categoryId,
      isActive: true,
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const overlapping = await this.prisma.budget.findFirst({ where });

    if (overlapping) {
      throw new ConflictException(
        'Ya existe un presupuesto activo para esta categoría en el período especificado',
      );
    }
  }

  private async calculateProgress(
    budget: BudgetWithCategory,
    userId: string,
  ): Promise<BudgetProgressDto> {
    const spent = await this.prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: TransactionType.EXPENSE,
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
      _sum: { amount: true },
    });

    const spentAmount = spent._sum.amount
      ? parseFloat(spent._sum.amount.toString())
      : 0;
    const budgetAmount = parseFloat(budget.amount.toString());
    const remaining = budgetAmount - spentAmount;
    const percentageUsed =
      budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
    const shouldAlert = percentageUsed >= budget.alertThreshold;
    const isOverBudget = spentAmount > budgetAmount;
    const daysRemaining = differenceInDays(budget.endDate, new Date());

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      category: {
        id: budget.category.id,
        name: budget.category.name,
        icon: budget.category.icon,
        color: budget.category.color,
      },
      amount: parseFloat(budgetAmount.toFixed(2)),
      spent: parseFloat(spentAmount.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      percentageUsed: parseFloat(percentageUsed.toFixed(2)),
      isOverBudget,
      shouldAlert,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
      daysRemaining: Math.max(0, daysRemaining),
      alertThreshold: budget.alertThreshold,
    };
  }

  private formatBudgetResponse(budget: BudgetWithCategory) {
    return {
      id: budget.id,
      name: budget.name,
      amount: parseFloat(budget.amount.toString()),
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
      alertThreshold: budget.alertThreshold,
      isActive: budget.isActive,
      category: budget.category,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }
}
