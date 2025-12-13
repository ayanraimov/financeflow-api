import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  console.log('🧹 Cleaning test database...');

  // Orden importante: borrar en orden inverso de dependencias
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.account.deleteMany(),
    prisma.category.deleteMany({ where: { isDefault: false } }),
    prisma.user.deleteMany(),
  ]);

  console.log('✅ Test database cleaned');
});

afterAll(async () => {
  console.log('🔌 Disconnecting Prisma...');
  await prisma.$disconnect();
});
