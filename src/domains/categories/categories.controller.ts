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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryStatsDto } from './dto/category-stats.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    const category = await this.categoriesService.create(
      userId,
      createCategoryDto,
    );
    return {
      success: true,
      data: category,
      message: 'Category created successfully',
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all categories (system defaults + user custom)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['INCOME', 'EXPENSE'],
    description: 'Filter by category type',
  })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
  ) {
    const categories = await this.categoriesService.findAll(userId, type);
    return {
      success: true,
      data: categories,
      count: categories.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const category = await this.categoriesService.findOne(userId, id);
    return {
      success: true,
      data: category,
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get category usage statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getStats(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query() filters: CategoryStatsDto,
  ) {
    const stats = await this.categoriesService.getStats(userId, id, filters);
    return {
      success: true,
      data: stats,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update custom category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({
    status: 403,
    description: 'Cannot update default categories',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(
      userId,
      id,
      updateCategoryDto,
    );
    return {
      success: true,
      data: category,
      message: 'Category updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete custom category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete default categories',
  })
  @ApiResponse({
    status: 409,
    description: 'Category has active transactions',
  })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return await this.categoriesService.remove(userId, id);
  }
}
