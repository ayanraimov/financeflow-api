/* eslint-disable */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Categorías de GASTOS (EXPENSE)
  const expenseCategories = [
    { name: 'Alimentación', icon: '🍔', color: '#FF6B6B', type: 'EXPENSE', isDefault: true },
    { name: 'Transporte', icon: '🚗', color: '#4ECDC4', type: 'EXPENSE', isDefault: true },
    { name: 'Vivienda', icon: '🏠', color: '#95E1D3', type: 'EXPENSE', isDefault: true },
    { name: 'Servicios', icon: '💡', color: '#F38181', type: 'EXPENSE', isDefault: true },
    { name: 'Salud', icon: '💊', color: '#AA96DA', type: 'EXPENSE', isDefault: true },
    { name: 'Educación', icon: '📚', color: '#FCBAD3', type: 'EXPENSE', isDefault: true },
    { name: 'Entretenimiento', icon: '🎮', color: '#FFFFD2', type: 'EXPENSE', isDefault: true },
    { name: 'Ropa', icon: '👕', color: '#A8D8EA', type: 'EXPENSE', isDefault: true },
    { name: 'Belleza', icon: '💄', color: '#FFCEF3', type: 'EXPENSE', isDefault: true },
    { name: 'Deporte', icon: '⚽', color: '#81F4E1', type: 'EXPENSE', isDefault: true },
    { name: 'Viajes', icon: '✈️', color: '#FF8B94', type: 'EXPENSE', isDefault: true },
    { name: 'Restaurantes', icon: '🍽️', color: '#FFD4A3', type: 'EXPENSE', isDefault: true },
    { name: 'Cafeterías', icon: '☕', color: '#FFEAA7', type: 'EXPENSE', isDefault: true },
    { name: 'Compras', icon: '🛍️', color: '#DFE6E9', type: 'EXPENSE', isDefault: true },
    { name: 'Mascotas', icon: '🐶', color: '#FAB1A0', type: 'EXPENSE', isDefault: true },
    { name: 'Tecnología', icon: '💻', color: '#74B9FF', type: 'EXPENSE', isDefault: true },
    { name: 'Seguros', icon: '🛡️', color: '#A29BFE', type: 'EXPENSE', isDefault: true },
    { name: 'Impuestos', icon: '📋', color: '#FD79A8', type: 'EXPENSE', isDefault: true },
    { name: 'Regalos', icon: '🎁', color: '#FDCB6E', type: 'EXPENSE', isDefault: true },
    { name: 'Donaciones', icon: '❤️', color: '#E17055', type: 'EXPENSE', isDefault: true },
    { name: 'Suscripciones', icon: '📱', color: '#6C5CE7', type: 'EXPENSE', isDefault: true },
    { name: 'Otros Gastos', icon: '📦', color: '#B2BEC3', type: 'EXPENSE', isDefault: true },
  ];

  // Categorías de INGRESOS (INCOME)
  const incomeCategories = [
    { name: 'Salario', icon: '💰', color: '#00B894', type: 'INCOME', isDefault: true },
    { name: 'Freelance', icon: '💼', color: '#00CEC9', type: 'INCOME', isDefault: true },
    { name: 'Inversiones', icon: '📈', color: '#0984E3', type: 'INCOME', isDefault: true },
    { name: 'Ventas', icon: '💵', color: '#55EFC4', type: 'INCOME', isDefault: true },
    { name: 'Alquiler', icon: '🏘️', color: '#81ECEC', type: 'INCOME', isDefault: true },
    { name: 'Bonos', icon: '🎉', color: '#74B9FF', type: 'INCOME', isDefault: true },
    { name: 'Otros Ingresos', icon: '💸', color: '#A29BFE', type: 'INCOME', isDefault: true },
  ];

  const allCategories = [...expenseCategories, ...incomeCategories];

  console.log(`📦 Creating ${allCategories.length} categories...`);

  for (const cat of allCategories) {
    await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type as any,
        isDefault: cat.isDefault,
      },
    });
  }

  console.log(`✅ Seed completed: ${allCategories.length} categories created`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
