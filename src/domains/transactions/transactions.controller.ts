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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { BulkTransactionDto } from './dto/bulk-transaction.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Account or Category not found' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    const transaction = await this.transactionsService.create(
      userId,
      createTransactionDto,
    );
    return {
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions with filters' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() filters: TransactionFilterDto,
  ) {
    const result = await this.transactionsService.findAll(userId, filters);
    return {
      success: true,
      ...result,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search transactions by description or notes' })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search query string',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 400, description: 'Empty search query' })
  async search(
    @CurrentUser('id') userId: string,
    @Query('query') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.transactionsService.search(
      userId,
      query,
      page,
      limit,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const transaction = await this.transactionsService.findOne(userId, id);
    return {
      success: true,
      data: transaction,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    const transaction = await this.transactionsService.update(
      userId,
      id,
      updateTransactionDto,
    );
    return {
      success: true,
      data: transaction,
      message: 'Transaction updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return await this.transactionsService.remove(userId, id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple transactions (bulk import)' })
  @ApiResponse({
    status: 201,
    description: 'Transactions created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async bulkCreate(
    @CurrentUser('id') userId: string,
    @Body() bulkTransactionDto: BulkTransactionDto,
  ) {
    return await this.transactionsService.bulkCreate(userId, bulkTransactionDto);
  }
}
