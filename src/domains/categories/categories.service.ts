import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryStatsDto, StatsPeriod } from './dto/category-stats.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create custom category for user
   */
  async create(userId: string, dto: CreateCategoryDto) {
    // Check if user already has a category with this name
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        userId,
        name: dto.name,
        type: dto.type,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `You already have a ${dto.type} category named "${dto.name}"`,
      );
    }

    const category = await this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        icon: dto.icon ?? '📁',
        color: dto.color ?? '#4ECDC4',
        isDefault: false,
      },
    });

    this.logger.log(
      `Custom category created: ${category.id} | Name: ${category.name} | User: ${userId}`,
    );

    return category;
  }

  /**
   * Find all categories: defaults + user's custom ones
   */
  async findAll(userId: string, type?: string) {
    const where: Prisma.CategoryWhereInput = {
      OR: [
        { isDefault: true }, // System default categories
        { userId }, // User's custom categories
      ],
      ...(type && { type: type as any }),
    };

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' }, // Defaults first
        { name: 'asc' }, // Then alphabetically
      ],
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return categories;
  }

  /**
   * Find one category by ID
   */
  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Validate access: must be default OR belong to user
    if (!category.isDefault && category.userId !== userId) {
      throw new ForbiddenException('Access denied to this category');
    }

    return category;
  }

  /**
   * Update category (only custom ones)
   */
  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(userId, id);

    // Cannot update default categories
    if (category.isDefault) {
      throw new ForbiddenException(
        'Cannot update default system categories. Create a custom one instead.',
      );
    }

    // Verify ownership
    if (category.userId !== userId) {
      throw new ForbiddenException('Access denied to this category');
    }

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== category.name) {
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          userId,
          name: dto.name,
          type: dto.type ?? category.type,
          id: { not: id },
        },
      });

      if (existingCategory) {
        throw new ConflictException(
          `You already have a category named "${dto.name}"`,
        );
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.icon && { icon: dto.icon }),
        ...(dto.color && { color: dto.color }),
      },
    });

    this.logger.log(`Category updated: ${id} | Name: ${updated.name}`);

    return updated;
  }

  /**
   * Delete category (only custom ones without active transactions)
   */
  async remove(userId: string, id: string) {
    const category = await this.findOne(userId, id);

    // Cannot delete default categories
    if (category.isDefault) {
      throw new ForbiddenException('Cannot delete default system categories');
    }

    // Verify ownership
    if (category.userId !== userId) {
      throw new ForbiddenException('Access denied to this category');
    }

    // Check if category has transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it has ${transactionCount} transaction(s) associated with it`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    this.logger.log(`Category deleted: ${id} | Name: ${category.name}`);

    return { success: true, message: 'Category deleted successfully' };
  }

  /**
   * Get category usage statistics
   */
  async getStats(userId: string, id: string, filters: CategoryStatsDto) {
    const category = await this.findOne(userId, id);

    // Calculate date range based on period
    const dateRange = this.calculateDateRange(filters);

    // Get transactions for this category and user
    const where: Prisma.TransactionWhereInput = {
      categoryId: id,
      userId, // Only count user's own transactions
      ...(dateRange.start && { date: { gte: dateRange.start } }),
      ...(dateRange.end && { date: { lte: dateRange.end } }),
    };

    const [aggregation, transactionCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalAmount = aggregation._sum.amount ?? new Decimal(0);
    const avgAmount =
      transactionCount > 0 ? totalAmount.div(transactionCount) : new Decimal(0);

    return {
      categoryId: id,
      categoryName: category.name,
      categoryType: category.type,
      period: filters.period,
      ...(filters.period === StatsPeriod.CUSTOM && {
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
      stats: {
        totalAmount: totalAmount.toNumber(),
        transactionCount,
        averageAmount: avgAmount.toNumber(),
      },
    };
  }

  /**
   * Helper: Calculate date range based on period
   */
  private calculateDateRange(filters: CategoryStatsDto): {
    start?: Date;
    end?: Date;
  } {
    const now = new Date();

    switch (filters.period) {
      case StatsPeriod.MONTH: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
        );
        return { start, end };
      }

      case StatsPeriod.YEAR: {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return { start, end };
      }

      case StatsPeriod.CUSTOM: {
        if (!filters.startDate || !filters.endDate) {
          throw new BadRequestException(
            'startDate and endDate are required for CUSTOM period',
          );
        }
        return {
          start: new Date(filters.startDate),
          end: new Date(filters.endDate),
        };
      }

      case StatsPeriod.ALL:
      default:
        return {};
    }
  }
}
