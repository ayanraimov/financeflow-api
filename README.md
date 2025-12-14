# FinanceFlow API 🚀

API REST para gestión de finanzas personales, construida con NestJS, TypeScript, PostgreSQL, Prisma y Redis. Desplegada en Railway con 37 endpoints production-ready.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌐 Production Deployment

**🔴 Live:** [https://financeflow-api-production.up.railway.app](https://financeflow-api-production.up.railway.app)

- **📚 Swagger Docs:** [/api/docs](https://financeflow-api-production.up.railway.app/api/docs)
- **💚 Health Check:** [/api/v1/health](https://financeflow-api-production.up.railway.app/api/v1/health)
- **🔐 API Base URL:** `/api/v1`

---

## ✨ Características Principales

### Autenticación & Seguridad
- ✅ JWT con refresh token rotation (automático)
- ✅ Bcrypt para hashing de contraseñas
- ✅ Guards de autenticación y autorización
- ✅ Ownership validation (usuarios solo acceden a sus recursos)
- ✅ Rate limiting (100 req/15min por IP)
- ✅ Helmet + CORS configurados

### Gestión Financiera
- ✅ **Cuentas:** CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT
- ✅ **Transacciones:** INCOME, EXPENSE con balance automático
- ✅ **Categorías:** Personalizables con estadísticas
- ✅ **Presupuestos:** Alertas al 80%, tracking en tiempo real
- ✅ **Analytics:** Dashboards con aggregations de Prisma

### Performance & Arquitectura
- ✅ Redis caching con fallback in-memory
- ✅ 16 índices optimizados en PostgreSQL
- ✅ Prisma transactions con isolation level Serializable
- ✅ Compression middleware (gzip)
- ✅ Response pagination (page, limit, hasNext, hasPrevious)
- ✅ Domain-Driven Design (DDD)

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Framework** | NestJS 10.x + TypeScript 5.3 |
| **Database** | PostgreSQL 16 + Prisma ORM 6.0 |
| **Cache** | Redis 7.x |
| **Auth** | JWT + Passport + bcrypt |
| **Validation** | class-validator + class-transformer |
| **Security** | Helmet, CORS, Throttler |
| **Documentation** | Swagger/OpenAPI 3.0 |
| **Testing** | Jest (22 E2E tests passing) |
| **Deployment** | Railway (PostgreSQL + Redis managed) |

---

## 📊 API Endpoints (37 total)

### 🔐 Auth (4 endpoints)
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Refrescar tokens
- `POST /auth/logout` - Cerrar sesión

### 👤 Users (2 endpoints)
- `GET /users/me` - Perfil del usuario
- `PATCH /users/me` - Actualizar perfil

### 💳 Accounts (5 endpoints)
- `POST /accounts` - Crear cuenta
- `GET /accounts` - Listar cuentas (paginado)
- `GET /accounts/:id` - Detalle de cuenta
- `PATCH /accounts/:id` - Actualizar cuenta
- `DELETE /accounts/:id` - Eliminar cuenta

### 💸 Transactions (6 endpoints)
- `POST /transactions` - Crear transacción
- `GET /transactions` - Listar transacciones (filtros + paginación)
- `GET /transactions/search` - Búsqueda avanzada
- `GET /transactions/:id` - Detalle de transacción
- `PATCH /transactions/:id` - Actualizar transacción
- `DELETE /transactions/:id` - Eliminar transacción

### 🏷️ Categories (5 endpoints)
- `POST /categories` - Crear categoría
- `GET /categories` - Listar categorías
- `GET /categories/:id` - Detalle de categoría
- `GET /categories/:id/stats` - Estadísticas de categoría
- `PATCH /categories/:id` - Actualizar categoría

### 📈 Budgets (6 endpoints)
- `POST /budgets` - Crear presupuesto
- `GET /budgets` - Listar presupuestos
- `GET /budgets/overview` - Resumen general
- `GET /budgets/:id` - Detalle de presupuesto
- `GET /budgets/:id/progress` - Progreso del presupuesto
- `PATCH /budgets/:id` - Actualizar presupuesto

### 📊 Analytics (6 endpoints)
- `GET /analytics/overview` - Dashboard general
- `GET /analytics/spending` - Análisis de gastos
- `GET /analytics/income` - Análisis de ingresos
- `GET /analytics/trends` - Tendencias temporales
- `GET /analytics/categories` - Análisis por categorías
- `GET /analytics/comparison` - Comparación de períodos

### ❤️ Health (1 endpoint)
- `GET /health` - Estado de la aplicación

---

## 🧪 Testing

### E2E Test Coverage (22 tests passing)

npm run test:e2e

**Results:**
Test Suites: 6 passed, 6 total
Tests: 22 passed, 22 total
Time: 11.47 s

**Test Suites:**
- ✅ **Auth Flow** (11 tests): Register, Login, Refresh, Logout + edge cases
- ✅ **Balance Integrity** (1 test): `accountBalance === SUM(INCOME) - SUM(EXPENSE)`
- ✅ **Ownership Validation** (2 tests): User A/B resource isolation
- ✅ **Budget Progress** (3 tests): 80% alert, 100% overbudget
- ✅ **Analytics Accuracy** (4 tests): Aggregations, savingsRate, topCategories
- ✅ **App Health** (1 test): Health endpoint

---

## 📋 Prerequisitos

- Node.js 20.x o superior
- Docker Desktop (para desarrollo local)
- npm o yarn

---

## 🚀 Instalación Local

### 1. Clonar repositorio
git clone https://github.com/ayanraimov/financeflow.git
cd financeflow

### 2. Instalar dependencias
npm install

### 3. Configurar variables de entorno
cp .env.example .env

**`.env` requerido:**
Database
DATABASE_URL="postgresql://user:password@localhost:5432/financeflow"

Redis
REDIS_URL="redis://localhost:6379"

JWT Secrets
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

App
NODE_ENV="development"
PORT=3000

### 4. Levantar servicios con Docker
docker-compose up -d

### 5. Ejecutar migraciones
npx prisma migrate dev

### 6. (Opcional) Seed de datos
npm run prisma:seed

---

## 🏃 Ejecutar la Aplicación

### Desarrollo
npm run start:dev

Accede a: [**http://localhost:3000/api/docs**](http://localhost:3000/api/docs)

### Producción
npm run build
npm run start:prod

---

## 🏗️ Arquitectura del Proyecto

src/
├── core/ # Cross-cutting concerns
│ ├── config/ # Configuración centralizada
│ ├── decorators/ # Custom decorators (@Public, @CurrentUser)
│ └── guards/ # JWT Guard
├── modules/
│ ├── auth/ # Authentication & JWT
│ ├── users/ # User management
│ ├── accounts/ # Bank accounts (CRUD)
│ ├── transactions/ # Transactions + balance updates
│ ├── categories/ # Categories + stats
│ ├── budgets/ # Budget tracking + alerts
│ └── analytics/ # Dashboards & aggregations
└── infrastructure/
├── database/ # Prisma Client + migrations
└── cache/ # Redis + in-memory fallback

**Prisma Schema:**
- 7 models: User, Account, Transaction, Category, Budget, RefreshToken, BlacklistedToken
- 16 optimized indexes
- Cascading deletes configurados
- Enums: AccountType, TransactionType, BudgetPeriod

---

## 🔐 Autenticación

Todos los endpoints (excepto `/auth/register` y `/auth/login`) requieren un **Bearer Token**:

curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
https://financeflow-api-production.up.railway.app/api/v1/users/me

**Token Refresh Flow:**
1. Login → `{ accessToken, refreshToken }`
2. AccessToken expira en 15 min
3. RefreshToken expira en 7 días
4. Al usar `/auth/refresh`, el refreshToken antiguo se invalida (rotation)

---

## 📚 Documentación Adicional

### Response Format
Todos los endpoints devuelven:
{
"success": true,
"data": { ... },
"message": "Optional message"
}

### Pagination Format
{
"success": true,
"data": [...],
"meta": {
"page": 1,
"limit": 10,
"total": 100,
"totalPages": 10,
"hasNext": true,
"hasPrevious": false
}
}

### Error Format
{
"success": false,
"message": "Error description",
"statusCode": 400
}

---

## 🚢 Deployment en Railway

### Variables de Entorno Requeridas
DATABASE_URL=${{Postgres.DATABASE_URL}} # Auto-generated
REDIS_URL=${{Redis.REDIS_URL}} # Auto-generated
JWT_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
NODE_ENV=production

### Scripts de Deployment
{
"build": "npm run build && npx prisma generate",
"start": "node dist/main"
}

### Health Check
- **Path:** `/api/v1/health`
- **Expected:** `200 OK`
- **Response:** `{ status: "healthy", database: "connected", ... }`

---

## 🎯 Roadmap

- [ ] WebSocket notifications (real-time budget alerts)
- [ ] Recurring transactions
- [ ] Multi-currency support
- [ ] Export CSV/PDF reports
- [ ] AI-powered spending insights
- [ ] Mobile app (React Native)

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

## 👤 Autor

**Ayan Reyhanov Raimov**

- LinkedIn: [@ayanreyhanov](https://www.linkedin.com/in/ayanreyhanov/)
- GitHub: [@ayanraimov](https://github.com/ayanraimov)
- Portfolio: [ayanreyhanov.dev](https://ayanreyhanov.dev)

---

## 🙏 Agradecimientos

- [NestJS](https://nestjs.com/) - Framework backend
- [Prisma](https://www.prisma.io/) - ORM para TypeScript
- [Railway](https://railway.app/) - Platform-as-a-Service
- [Swagger](https://swagger.io/) - API Documentation

---

**⭐ Si te gustó este proyecto, dale una estrella!**