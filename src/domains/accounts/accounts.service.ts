import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateAccountDto, UpdateAccountDto, AccountResponseDto } from './dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    const account = await this.prisma.account.create({
      data: {
        name: createAccountDto.name,
        type: createAccountDto.type,
        balance: createAccountDto.initialBalance,
        currency: createAccountDto.currency || 'EUR',
        color: createAccountDto.color || '#4ECDC4',
        // @ts-ignore - Prisma types con type casting
        icon: createAccountDto.icon || '💳',
        userId,
      },
    });

    // @ts-ignore - Prisma types con type casting
    return account;
  }

  async findAll(userId: string): Promise<AccountResponseDto[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // @ts-ignore - Prisma types con type casting
    return accounts;
  }

  async findOne(id: string, userId: string): Promise<AccountResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta cuenta');
    }

    // @ts-ignore - Prisma types con type casting
    return account;
  }

  async update(
    id: string,
    userId: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    // Verificar existencia y propiedad
    await this.findOne(id, userId);

    const account = await this.prisma.account.update({
      where: { id },
      data: updateAccountDto,
    });

    // @ts-ignore - Prisma types con type casting
    return account;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Verificar existencia y propiedad
    await this.findOne(id, userId);

    await this.prisma.account.delete({
      where: { id },
    });

    return { message: 'Cuenta eliminada exitosamente' };
  }
}
