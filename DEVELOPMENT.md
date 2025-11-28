# Notas de Desarrollo - FinanceFlow

## Día 1 - 28/11/2025

### Completado:
- ✅ Setup inicial NestJS con TypeScript strict
- ✅ Docker Compose (PostgreSQL + Redis)
- ✅ Prisma schema con 5 modelos
- ✅ Módulo Auth completo con JWT
- ✅ Swagger documentation

### Aprendizajes:
- TypeScript strict mode es muy estricto con tipos de librerías externas
- @ts-ignore es aceptable cuando los tipos de la librería son problemáticos
- Bcrypt hashea passwords con salt rounds = 10
- Refresh tokens se guardan hasheados en BD por seguridad

### Desafíos Superados:
- Problemas de tipos con JwtService.signAsync() → Solución: usar .sign() o @ts-ignore
- ESLint warnings con Helmet → Solución: usar require() dentro de la función

### Próximos Pasos:
- Implementar módulo Users
- Exception filter global
- Seed de categorías
