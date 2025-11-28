# FinanceFlow API

API REST para gestión de finanzas personales con IA, construida con NestJS, TypeScript, PostgreSQL y Prisma.

## 🚀 Características

- ✅ Autenticación JWT con refresh tokens
- ✅ Arquitectura Domain-Driven Design (DDD)
- ✅ TypeScript strict mode
- ✅ Base de datos PostgreSQL + Prisma ORM
- ✅ Redis para caché
- ✅ Documentación automática con Swagger
- ✅ Rate limiting y seguridad (Helmet, CORS)
- ✅ Validación exhaustiva de DTOs

## 🛠️ Stack Tecnológico

- **Backend:** NestJS 10.x, TypeScript 5.x
- **Base de Datos:** PostgreSQL 16 + Prisma 6
- **Caché:** Redis 7
- **Autenticación:** JWT + Passport + bcrypt
- **Documentación:** Swagger/OpenAPI
- **Validación:** class-validator, class-transformer
- **Seguridad:** Helmet, CORS, Throttler

## 📋 Prerequisitos

- Node.js 20.x o superior
- Docker Desktop
- npm o yarn

## 🚀 Instalación

1. Clonar el repositorio
\`\`\`bash
git clone https://github.com/tu-usuario/financeflow.git
cd financeflow
\`\`\`

2. Instalar dependencias
\`\`\`bash
npm install
\`\`\`

3. Configurar variables de entorno
\`\`\`bash
cp .env.example .env
# Editar .env con tus valores
\`\`\`

4. Levantar servicios con Docker
\`\`\`bash
docker-compose up -d
\`\`\`

5. Ejecutar migraciones de Prisma
\`\`\`bash
npx prisma migrate dev
\`\`\`

6. (Opcional) Ejecutar seed de datos
\`\`\`bash
npm run seed
\`\`\`

## 🏃 Ejecutar la Aplicación

### Modo desarrollo
\`\`\`bash
npm run start:dev
\`\`\`

### Modo producción
\`\`\`bash
npm run build
npm run start:prod
\`\`\`

## 📚 Documentación API

Una vez iniciada la aplicación, accede a:
- **Swagger UI:** http://localhost:3000/api/docs
- **API Base URL:** http://localhost:3000/api/v1

## 🏗️ Estructura del Proyecto

\`\`\`
src/
├── core/                    # Cross-cutting concerns
│   ├── config/             # Configuración centralizada
│   ├── decorators/         # Decoradores personalizados
│   └── guards/             # Guards globales
├── domains/                # Bounded contexts (DDD)
│   ├── auth/               # Autenticación y autorización
│   ├── users/              # Gestión de usuarios
│   ├── accounts/           # Cuentas bancarias
│   ├── transactions/       # Transacciones
│   ├── categories/         # Categorías
│   └── budgets/            # Presupuestos
└── infrastructure/
    ├── database/           # Prisma configuration
    └── cache/              # Redis configuration
\`\`\`

## 🔐 Autenticación

Todos los endpoints protegidos requieren un token JWT en el header:
\`\`\`
Authorization: Bearer {tu-access-token}
\`\`\`

## 🧪 Testing

\`\`\`bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
\`\`\`

## 📄 Licencia

MIT

## 👤 Autor

Ayan Reyhanov Raimov - [LinkedIn](https://www.linkedin.com/in/ayanreyhanov/) - [GitHub](https://github.com/ayanraimov)
