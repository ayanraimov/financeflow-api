import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  PaginatedResponse,
  PaginationMeta,
} from '../../core/interfaces/paginated-response.interface';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { BulkTransactionDto } from './dto/bulk-transaction.dto';
import { Prisma, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CacheInvalidationService } from '../../core/services/cache-invalidation.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  /**
   * Create single transaction with atomic balance update
   */
  async create(userId: string, dto: CreateTransactionDto) {
    await this.validateAccountOwnership(userId, dto.accountId);
    await this.validateCategoryTypeMatch(dto.categoryId, dto.type);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            userId,
            accountId: dto.accountId,
            categoryId: dto.categoryId,
            type: dto.type,
            amount: new Decimal(dto.amount),
            description: dto.description,
            date: new Date(dto.date),
            notes: dto.notes,
            isRecurring: dto.isRecurring ?? false,
          },
          include: {
            category: {
              select: { name: true, icon: true, color: true },
            },
            account: {
              select: { name: true, type: true, currency: true },
            },
          },
        });

        const balanceChange =
          dto.type === TransactionType.INCOME
            ? new Decimal(dto.amount)
            : new Decimal(dto.amount).negated();

        await tx.account.update({
          where: { id: dto.accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });

        this.logger.log(
          `Transaction created: ${transaction.id} | Type: ${dto.type} | Amount: ${dto.amount} | Account: ${dto.accountId}`,
        );

        return transaction;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    await this.cacheInvalidation.invalidateTransactionRelated(userId);

    return result;
  }

  /**
   * Find all transactions with filters and pagination
   */
  async findAll(
    userId: string,
    filters: TransactionFilterDto,
  ): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 20,
      accountId,
      categoryId,
      type,
      startDate,
      endDate,
      search,
    } = filters;

    // Build where clause
    const where: any = { userId };

    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          account: {
            select: { id: true, name: true, type: true, color: true },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };

    return {
      success: true,
      data: transactions,
      meta,
    };
  }

  /**
   * Find one transaction by ID
   */
  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: {
          select: { name: true, icon: true, color: true, type: true },
        },
        account: {
          select: { name: true, type: true, currency: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('Access denied to this transaction');
    }

    return transaction;
  }

  /**
   * Update transaction with balance recalculation
   */
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const original = await this.findOne(userId, id);

    if (dto.accountId && dto.accountId !== original.accountId) {
      await this.validateAccountOwnership(userId, dto.accountId);
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const oldAmount = new Decimal(original.amount.toString());
        const newAmount = dto.amount ? new Decimal(dto.amount) : oldAmount;
        const oldType = original.type;
        const newType = dto.type ?? oldType;
        const oldAccountId = original.accountId;
        const newAccountId = dto.accountId ?? oldAccountId;

        const updated = await tx.transaction.update({
          where: { id },
          data: {
            ...(dto.accountId && { accountId: dto.accountId }),
            ...(dto.categoryId && { categoryId: dto.categoryId }),
            ...(dto.type && { type: dto.type }),
            ...(dto.amount && { amount: newAmount }),
            ...(dto.description && { description: dto.description }),
            ...(dto.date && { date: new Date(dto.date) }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
            ...(dto.isRecurring !== undefined && {
              isRecurring: dto.isRecurring,
            }),
          },
          include: {
            category: {
              select: { name: true, icon: true, color: true },
            },
            account: {
              select: { name: true, type: true, currency: true },
            },
          },
        });

        const oldBalanceChange =
          oldType === TransactionType.INCOME ? oldAmount : oldAmount.negated();
        await tx.account.update({
          where: { id: oldAccountId },
          data: { balance: { decrement: oldBalanceChange } },
        });

        const newBalanceChange =
          newType === TransactionType.INCOME ? newAmount : newAmount.negated();
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newBalanceChange } },
        });

        this.logger.log(
          `Transaction updated: ${id} | Amount: ${oldAmount} -> ${newAmount} | Type: ${oldType} -> ${newType}`,
        );

        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    await this.cacheInvalidation.invalidateTransactionRelated(userId);

    return result;
  }

  /**
   * Delete transaction and revert balance
   */
  async remove(userId: string, id: string) {
    const transaction = await this.findOne(userId, id);

    await this.prisma.$transaction(
      async (tx) => {
        const amount = new Decimal(transaction.amount.toString());
        const balanceChange =
          transaction.type === TransactionType.INCOME
            ? amount.negated()
            : amount;

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        await tx.transaction.delete({
          where: { id },
        });

        this.logger.log(
          `Transaction deleted: ${id} | Reverted balance for account ${transaction.accountId}`,
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    await this.cacheInvalidation.invalidateTransactionRelated(userId);

    return { success: true, message: 'Transaction deleted successfully' };
  }

  /**
   * Search transactions by description or notes
   */
  async search(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20,
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const safePage = page ?? 1;
    const safeLimit = limit ?? 20;

    const where: Prisma.TransactionWhereInput = {
      userId,
      OR: [
        { description: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          category: { select: { name: true, icon: true, color: true } },
          account: { select: { name: true, type: true, currency: true } },
        },
        orderBy: { date: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Bulk create transactions (for CSV imports)
   */
  async bulkCreate(userId: string, dto: BulkTransactionDto) {
    const accountIds = [...new Set(dto.transactions.map((t) => t.accountId))];
    await Promise.all(
      accountIds.map((accountId) =>
        this.validateAccountOwnership(userId, accountId),
      ),
    );

    const results = await this.prisma.$transaction(
      async (tx) => {
        const created = [];

        for (const transactionDto of dto.transactions) {
          const transaction = await tx.transaction.create({
            data: {
              userId,
              accountId: transactionDto.accountId,
              categoryId: transactionDto.categoryId,
              type: transactionDto.type,
              amount: new Decimal(transactionDto.amount),
              description: transactionDto.description,
              date: new Date(transactionDto.date),
              notes: transactionDto.notes,
              isRecurring: transactionDto.isRecurring ?? false,
            },
          });

          const balanceChange =
            transactionDto.type === TransactionType.INCOME
              ? new Decimal(transactionDto.amount)
              : new Decimal(transactionDto.amount).negated();

          await tx.account.update({
            where: { id: transactionDto.accountId },
            data: { balance: { increment: balanceChange } },
          });

          created.push(transaction);
        }

        this.logger.log(
          `Bulk created ${created.length} transactions for user ${userId}`,
        );
        return created;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 30000,
      },
    );

    await this.cacheInvalidation.invalidateTransactionRelated(userId);

    return { success: true, data: results, count: results.length };
  }

  /**
   * Recalculate account balance from all transactions
   */
  async recalculateAccountBalance(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    const aggregations = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { accountId, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { accountId, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = aggregations[0]._sum.amount ?? new Decimal(0);
    const totalExpense = aggregations[1]._sum.amount ?? new Decimal(0);

    const calculatedBalance = totalIncome.minus(totalExpense);

    await this.prisma.account.update({
      where: { id: accountId },
      data: { balance: calculatedBalance },
    });

    this.logger.log(
      `Balance recalculated for account ${accountId}: ${calculatedBalance.toString()}`,
    );

    return calculatedBalance;
  }

  // ==================== PRIVATE HELPERS ====================

  private async validateCategoryTypeMatch(
    categoryId: string,
    transactionType: TransactionType,
  ): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { type: true, name: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (category.type !== transactionType) {
      throw new BadRequestException(
        `Category type mismatch: "${category.name}" is a ${category.type} category, but you're trying to create a ${transactionType} transaction`,
      );
    }
  }

  private async validateAccountOwnership(
    userId: string,
    accountId: string,
  ): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { userId: true },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('Access denied to this account');
    }
  }
}
