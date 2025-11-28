import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UpdateUserDto, UserResponseDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        defaultCurrency: true,
        emailVerified: true,
        createdAt: true,
        password: false,
        refreshToken: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return new UserResponseDto(user);
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        defaultCurrency: true,
        emailVerified: true,
        createdAt: true,
        password: false,
        refreshToken: false,
      },
    });

    return new UserResponseDto(user);
  }
}
