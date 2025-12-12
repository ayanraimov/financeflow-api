import {
  Injectable,
  Logger,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '../../core/interceptors/cache.interceptor';
import { CacheResult } from '../../core/decorators/cache-result.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TransactionType, Prisma } from '@prisma/client';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  differenceInDays,
  format,
} from 'date-fns';
import {
  AnalyticsPeriod,
  AnalyticsPeriodDto,
} from './dto/analytics-period.dto';
import { CategorySummary } from './interfaces/category-summary.interface';

@Injectable()
@UseInterceptors(CacheInterceptor)
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @CacheResult('analytics:overview', 300)
  async getOverview(
    userId: string,
    period: AnalyticsPeriod,
    date?: string,
    startDate?: string,
    endDate?: string,
  ) {
    this.logger.log(`Getting overview for user ${userId}, period ${period}`);

    const { startDate: start, endDate: end } = this.calculateDateRange(
      period,
      date,
      startDate,
      endDate,
    );

    const [
      incomeResult,
      expensesResult,
      accountsBalance,
      transactionCount,
      topCategories,
      recentTransactions,
    ] = await Promise.all([
      this.getTransactionsSummary(userId, start, end, TransactionType.INCOME),
      this.getTransactionsSummary(userId, start, end, TransactionType.EXPENSE),
      this.getAccountsBalance(userId),
      this.prisma.transaction.count({
        where: {
          userId,
          date: { gte: start, lte: end },
        },
      }),
      this.getTopCategories(userId, start, end, TransactionType.EXPENSE, 5),
      this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: start, lte: end },
        },
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
          account: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    const totalIncome = incomeResult.total;
    const totalExpenses = expensesResult.total;
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const days = differenceInDays(end, start) + 1;
    const avgDailyExpense = days > 0 ? totalExpenses / days : 0;

    return {
      success: true,
      data: {
        period,
        startDate: start,
        endDate: end,
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        netSavings: parseFloat(netSavings.toFixed(2)),
        savingsRate: parseFloat(savingsRate.toFixed(2)),
        accountsBalance: parseFloat(accountsBalance.toFixed(2)),
        transactionCount,
        avgDailyExpense: parseFloat(avgDailyExpense.toFixed(2)),
        topCategories,
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount.toString()),
          description: t.description,
          date: t.date,
          category: t.category,
          account: t.account,
        })),
      },
    };
  }

  @CacheResult('analytics:spending', 300)
  async getSpending(userId: string, startDate: string, endDate: string) {
    this.logger.log(`Getting spending analysis for user ${userId}`);

    this.validateDateRange(startDate, endDate);

    const start = new Date(startDate);
    const end = new Date(endDate);

    const [summary, byCategory, largestExpense, dailyBreakdown] =
      await Promise.all([
        this.getTransactionsSummary(
          userId,
          start,
          end,
          TransactionType.EXPENSE,
        ),
        this.getCategoryBreakdown(userId, start, end, TransactionType.EXPENSE),
        this.prisma.transaction.findFirst({
          where: {
            userId,
            type: TransactionType.EXPENSE,
            date: { gte: start, lte: end },
          },
          include: {
            category: {
              select: { id: true, name: true, icon: true, color: true },
            },
            account: { select: { id: true, name: true, type: true } },
          },
          orderBy: { amount: 'desc' },
        }),
        this.getDailyBreakdown(userId, start, end, TransactionType.EXPENSE),
      ]);

    const days = differenceInDays(end, start) + 1;
    const avgDailyExpense = days > 0 ? summary.total / days : 0;

    return {
      success: true,
      data: {
        startDate: start,
        endDate: end,
        totalExpenses: parseFloat(summary.total.toFixed(2)),
        transactionCount: summary.count,
        avgDailyExpense: parseFloat(avgDailyExpense.toFixed(2)),
        avgTransactionAmount: parseFloat(summary.average.toFixed(2)),
        byCategory,
        largestExpense: largestExpense
          ? {
              id: largestExpense.id,
              amount: parseFloat(largestExpense.amount.toString()),
              description: largestExpense.description,
              date: largestExpense.date,
              category: largestExpense.category,
              account: largestExpense.account,
            }
          : null,
        dailyBreakdown,
      },
    };
  }

  @CacheResult('analytics:income', 300)
  async getIncome(userId: string, startDate: string, endDate: string) {
    this.logger.log(`Getting income analysis for user ${userId}`);

    this.validateDateRange(startDate, endDate);

    const start = new Date(startDate);
    const end = new Date(endDate);

    const [summary, byCategory, largestIncome, dailyBreakdown] =
      await Promise.all([
        this.getTransactionsSummary(userId, start, end, TransactionType.INCOME),
        this.getCategoryBreakdown(userId, start, end, TransactionType.INCOME),
        this.prisma.transaction.findFirst({
          where: {
            userId,
            type: TransactionType.INCOME,
            date: { gte: start, lte: end },
          },
          include: {
            category: {
              select: { id: true, name: true, icon: true, color: true },
            },
            account: { select: { id: true, name: true, type: true } },
          },
          orderBy: { amount: 'desc' },
        }),
        this.getDailyBreakdown(userId, start, end, TransactionType.INCOME),
      ]);

    const days = differenceInDays(end, start) + 1;
    const avgDailyIncome = days > 0 ? summary.total / days : 0;

    return {
      success: true,
      data: {
        startDate: start,
        endDate: end,
        totalIncome: parseFloat(summary.total.toFixed(2)),
        transactionCount: summary.count,
        avgDailyIncome: parseFloat(avgDailyIncome.toFixed(2)),
        avgTransactionAmount: parseFloat(summary.average.toFixed(2)),
        byCategory,
        largestIncome: largestIncome
          ? {
              id: largestIncome.id,
              amount: parseFloat(largestIncome.amount.toString()),
              description: largestIncome.description,
              date: largestIncome.date,
              category: largestIncome.category,
              account: largestIncome.account,
            }
          : null,
        dailyBreakdown,
      },
    };
  }

  async getTrends(userId: string, period: AnalyticsPeriod, intervals: number) {
    this.logger.log(
      `Getting trends for user ${userId}, period ${period}, intervals ${intervals}`,
    );

    const trendsData = [];

    for (let i = intervals - 1; i >= 0; i--) {
      const { startDate, endDate, label } = this.calculateIntervalDates(
        period,
        i,
      );

      const [income, expenses] = await Promise.all([
        this.getTransactionsSummary(
          userId,
          startDate,
          endDate,
          TransactionType.INCOME,
        ),
        this.getTransactionsSummary(
          userId,
          startDate,
          endDate,
          TransactionType.EXPENSE,
        ),
      ]);

      const netSavings = income.total - expenses.total;
      const savingsRate =
        income.total > 0 ? (netSavings / income.total) * 100 : 0;

      trendsData.push({
        label,
        startDate,
        endDate,
        income: parseFloat(income.total.toFixed(2)),
        expenses: parseFloat(expenses.total.toFixed(2)),
        netSavings: parseFloat(netSavings.toFixed(2)),
        savingsRate: parseFloat(savingsRate.toFixed(2)),
      });
    }

    return {
      success: true,
      data: {
        period,
        intervals,
        data: trendsData,
      },
    };
  }

  @CacheResult('analytics:categories', 300)
  async getCategoriesDistribution(
    userId: string,
    period: AnalyticsPeriod,
    date?: string,
  ) {
    this.logger.log(
      `Getting categories distribution for user ${userId}, period ${period}`,
    );

    const { startDate, endDate } = this.calculateDateRange(period, date);

    const [totalExpenses, categories] = await Promise.all([
      this.getTransactionsSummary(
        userId,
        startDate,
        endDate,
        TransactionType.EXPENSE,
      ),
      this.getCategoryBreakdown(
        userId,
        startDate,
        endDate,
        TransactionType.EXPENSE,
      ),
    ]);

    return {
      success: true,
      data: {
        period,
        startDate,
        endDate,
        totalExpenses: parseFloat(totalExpenses.total.toFixed(2)),
        categories,
      },
    };
  }

  @CacheResult('analytics:comparison', 300)
  async getComparison(
    userId: string,
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
  ) {
    this.logger.log(`Getting comparison for user ${userId}`);

    this.validateDateRange(currentStart, currentEnd);
    this.validateDateRange(previousStart, previousEnd);

    const [currentIncome, currentExpenses, previousIncome, previousExpenses] =
      await Promise.all([
        this.getTransactionsSummary(
          userId,
          new Date(currentStart),
          new Date(currentEnd),
          TransactionType.INCOME,
        ),
        this.getTransactionsSummary(
          userId,
          new Date(currentStart),
          new Date(currentEnd),
          TransactionType.EXPENSE,
        ),
        this.getTransactionsSummary(
          userId,
          new Date(previousStart),
          new Date(previousEnd),
          TransactionType.INCOME,
        ),
        this.getTransactionsSummary(
          userId,
          new Date(previousStart),
          new Date(previousEnd),
          TransactionType.EXPENSE,
        ),
      ]);

    const currentNetSavings = currentIncome.total - currentExpenses.total;
    const previousNetSavings = previousIncome.total - previousExpenses.total;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      success: true,
      data: {
        current: {
          startDate: new Date(currentStart),
          endDate: new Date(currentEnd),
          income: parseFloat(currentIncome.total.toFixed(2)),
          expenses: parseFloat(currentExpenses.total.toFixed(2)),
          netSavings: parseFloat(currentNetSavings.toFixed(2)),
        },
        previous: {
          startDate: new Date(previousStart),
          endDate: new Date(previousEnd),
          income: parseFloat(previousIncome.total.toFixed(2)),
          expenses: parseFloat(previousExpenses.total.toFixed(2)),
          netSavings: parseFloat(previousNetSavings.toFixed(2)),
        },
        changes: {
          incomeChange: parseFloat(
            calculateChange(currentIncome.total, previousIncome.total).toFixed(
              2,
            ),
          ),
          incomeChangeAmount: parseFloat(
            (currentIncome.total - previousIncome.total).toFixed(2),
          ),
          expensesChange: parseFloat(
            calculateChange(
              currentExpenses.total,
              previousExpenses.total,
            ).toFixed(2),
          ),
          expensesChangeAmount: parseFloat(
            (currentExpenses.total - previousExpenses.total).toFixed(2),
          ),
          savingsChange: parseFloat(
            calculateChange(currentNetSavings, previousNetSavings).toFixed(2),
          ),
          savingsChangeAmount: parseFloat(
            (currentNetSavings - previousNetSavings).toFixed(2),
          ),
        },
      },
    };
  }

  // ==================== HELPER METHODS ====================

  private calculateDateRange(
    period: AnalyticsPeriod,
    dateStr?: string,
    customStartDate?: string,
    customEndDate?: string,
  ): { startDate: Date; endDate: Date } {
    const referenceDate = dateStr ? new Date(dateStr) : new Date();

    switch (period) {
      case AnalyticsPeriod.WEEK:
        return {
          startDate: startOfWeek(referenceDate, { weekStartsOn: 1 }),
          endDate: endOfWeek(referenceDate, { weekStartsOn: 1 }),
        };

      case AnalyticsPeriod.MONTH:
        return {
          startDate: startOfMonth(referenceDate),
          endDate: endOfMonth(referenceDate),
        };

      case AnalyticsPeriod.YEAR:
        return {
          startDate: startOfYear(referenceDate),
          endDate: endOfYear(referenceDate),
        };

      case AnalyticsPeriod.CUSTOM:
        if (!customStartDate || !customEndDate) {
          throw new BadRequestException(
            'Las fechas startDate y endDate son requeridas cuando el período es "custom"',
          );
        }

        // Validar el rango
        this.validateDateRange(customStartDate, customEndDate);

        return {
          startDate: new Date(customStartDate),
          endDate: new Date(customEndDate),
        };

      default:
        throw new BadRequestException('Período inválido');
    }
  }

  private calculateIntervalDates(
    period: AnalyticsPeriod,
    intervalsAgo: number,
  ): { startDate: Date; endDate: Date; label: string } {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case AnalyticsPeriod.WEEK:
        const weekDate = subWeeks(now, intervalsAgo);
        startDate = startOfWeek(weekDate, { weekStartsOn: 1 });
        endDate = endOfWeek(weekDate, { weekStartsOn: 1 });
        break;
      case AnalyticsPeriod.MONTH:
        const monthDate = subMonths(now, intervalsAgo);
        startDate = startOfMonth(monthDate);
        endDate = endOfMonth(monthDate);
        break;
      case AnalyticsPeriod.YEAR:
        const yearDate = subYears(now, intervalsAgo);
        startDate = startOfYear(yearDate);
        endDate = endOfYear(yearDate);
        break;
      default:
        throw new BadRequestException('Período inválido');
    }

    const label = format(
      startDate,
      period === AnalyticsPeriod.YEAR ? 'yyyy' : 'MMM yyyy',
    );

    return { startDate, endDate, label };
  }

  private async getTransactionsSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
    type?: TransactionType,
  ): Promise<{ total: number; count: number; average: number }> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      date: { gte: startDate, lte: endDate },
    };

    if (type) {
      where.type = type;
    }

    const result = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    return {
      total: result._sum.amount ? parseFloat(result._sum.amount.toString()) : 0,
      count: result._count,
      average: result._avg.amount
        ? parseFloat(result._avg.amount.toString())
        : 0,
    };
  }

  private async getCategoryBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date,
    type: TransactionType,
  ): Promise<CategorySummary[]> {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const total = grouped.reduce(
      (sum, item) => sum + parseFloat(item._sum.amount?.toString() || '0'),
      0,
    );

    const categoriesData = await Promise.all(
      grouped.map(async (item) => {
        const category = await this.prisma.category.findUnique({
          where: { id: item.categoryId },
          select: { id: true, name: true, icon: true, color: true },
        });

        const amount = parseFloat(item._sum.amount?.toString() || '0');
        const percentage = total > 0 ? (amount / total) * 100 : 0;

        return {
          categoryId: item.categoryId,
          categoryName: category?.name || 'Unknown',
          icon: category?.icon || '❓',
          color: category?.color || '#999999',
          amount: parseFloat(amount.toFixed(2)),
          percentage: parseFloat(percentage.toFixed(2)),
          transactionCount: item._count,
        };
      }),
    );

    return categoriesData;
  }

  private async getTopCategories(
    userId: string,
    startDate: Date,
    endDate: Date,
    type: TransactionType,
    limit: number,
  ): Promise<CategorySummary[]> {
    const breakdown = await this.getCategoryBreakdown(
      userId,
      startDate,
      endDate,
      type,
    );
    return breakdown.slice(0, limit);
  }

  private async getDailyBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date,
    type: TransactionType,
  ): Promise<Array<{ date: string; amount: number; count: number }>> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        amount: true,
      },
    });

    const dailyMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach((t) => {
      const dateKey = format(t.date, 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || { amount: 0, count: 0 };
      dailyMap.set(dateKey, {
        amount: existing.amount + parseFloat(t.amount.toString()),
        count: existing.count + 1,
      });
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: parseFloat(data.amount.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getAccountsBalance(userId: string): Promise<number> {
    const result = await this.prisma.account.aggregate({
      where: { userId },
      _sum: { balance: true },
    });

    return result._sum.balance ? parseFloat(result._sum.balance.toString()) : 0;
  }

  private validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    if (start > new Date()) {
      throw new BadRequestException('La fecha de inicio no puede ser futura');
    }

    const diffInDays = differenceInDays(end, start);
    if (diffInDays > 365) {
      throw new BadRequestException(
        'El rango de fechas no puede exceder 1 año (365 días)',
      );
    }
  }
}
