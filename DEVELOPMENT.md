# Notas de Desarrollo - FinanceFlow

## Día 1 - 28/11/2025

### ⚙️ Setup Inicial

#### Infraestructura
- ✅ NestJS v10 con TypeScript strict mode
- ✅ Docker Compose configurado:
    - PostgreSQL 15 (puerto 5432)
    - Redis 7 (puerto 6379)
- ✅ Variables de entorno (.env):
    - DATABASE_URL para Prisma
    - JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
    - JWT_ACCESS_EXPIRATION=15m
    - JWT_REFRESH_EXPIRATION=7d

#### Prisma Schema
Modelos implementados:
1. **User**: email único, password hasheado, refreshToken nullable
2. **Account**: relación con User, tipo enum, balance Decimal
3. **Category**: tipo enum (INCOME/EXPENSE), color, icon
4. **Transaction**: relación con Account y Category, amount Decimal
5. **Budget**: límites de gasto por categoría

**Tipos especiales:**
- `Decimal @db.Decimal(15,2)` para amounts/balance
- Enums: AccountType, CategoryType, TransactionType
- Índices: `@@index([userId])` para optimización

---

## 🎯 Acto 1: Autenticación y Usuarios

### Módulo Auth (4 endpoints)

#### 1. POST /auth/register
**Funcionalidad:**
- Registro de nuevos usuarios
- Hash de password con bcrypt (saltRounds: 10)
- Generación de accessToken + refreshToken
- RefreshToken hasheado antes de guardar en BD

**Request:**
{
"email": "juan.perez@example.com",
"password": "SecurePass123!",
"name": "Juan Pérez"
}

**Response (201):**
{
"user": {
"id": "uuid",
"email": "juan.perez@example.com",
"name": "Juan Pérez"
},
"accessToken": "eyJhbGc...",
"refreshToken": "eyJhbGc..."
}

**Validaciones (class-validator):**
- Email válido y único
- Password: mínimo 8 caracteres
- Name: mínimo 2 caracteres

#### 2. POST /auth/login
**Funcionalidad:**
- Autenticación con email/password
- Comparación bcrypt del password
- Actualiza refreshToken en BD

**Request:**
{
"email": "juan.perez@example.com",
"password": "SecurePass123!"
}

**Response (200):**
{
"user": {
"id": "uuid",
"email": "juan.perez@example.com",
"name": "Juan Pérez"
},
"accessToken": "eyJhbGc...",
"refreshToken": "eyJhbGc..."
}

#### 3. POST /auth/refresh
**Funcionalidad:**
- Renovación de accessToken sin re-login
- Valida refreshToken hasheado en BD
- Genera nuevo par de tokens

**Request:**
{
"refreshToken": "eyJhbGc..."
}

**Response (200):**
{
"accessToken": "eyJhbGc...",
"refreshToken": "eyJhbGc..."
}

#### 4. POST /auth/logout
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Invalida refreshToken (setea a null en BD)
- No invalida accessToken (stateless JWT)

**Response (200):**
{
"message": "Sesión cerrada exitosamente"
}

---

### Módulo Users (2 endpoints)

#### 1. GET /users/me
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Obtiene perfil del usuario autenticado
- Usa decorator `@CurrentUser()` personalizado

**Response (200):**
{
"id": "uuid",
"email": "juan.perez@example.com",
"name": "Juan Pérez",
"createdAt": "2025-11-28T10:00:00.000Z",
"updatedAt": "2025-11-28T10:00:00.000Z"
}

#### 2. PATCH /users/me
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Actualiza nombre del usuario
- Solo permite actualizar el campo `name`

**Request:**
{
"name": "Juan Carlos Pérez"
}

**Response (200):**
{
"id": "uuid",
"email": "juan.perez@example.com",
"name": "Juan Carlos Pérez",
"updatedAt": "2025-11-28T12:30:00.000Z"
}

---

### 🛡️ Core - Guards & Decorators

#### JwtAuthGuard
**Ubicación:** `src/core/guards/jwt-auth.guard.ts`

**Funcionalidad:**
- Valida accessToken en header Authorization
- Extrae payload del JWT
- Inyecta `user` en request

**Uso:**
@UseGuards(JwtAuthGuard)
@Get('me')
getProfile(@CurrentUser() user: User) {
return user;
}

#### @CurrentUser() Decorator
**Ubicación:** `src/core/decorators/current-user.decorator.ts`

**Funcionalidad:**
- Extrae el usuario del request
- Type-safe con TypeScript

---

### 🎨 Exception Filter Global

**Ubicación:** `src/core/filters/all-exceptions.filter.ts`

**Formato de respuesta consistente:**
{
"success": false,
"statusCode": 400,
"timestamp": "2025-11-28T14:30:00.000Z",
"path": "/auth/login",
"method": "POST",
"message": "Credenciales inválidas",
"error": "UnauthorizedException"
}

**Maneja:**
- HttpException (NestJS)
- Prisma errors (unique constraint, not found)
- Errores inesperados (500)

---

### 📚 Aprendizajes Clave

#### TypeScript Strict Mode
**Problema:** JwtService.signAsync() tiene tipos problemáticos
**Soluciones probadas:**
1. Usar `.sign()` (síncrono) en lugar de `.signAsync()`
2. Type casting: `as any`
3. `@ts-ignore` con comentario explicativo ✅ Solución adoptada

#### Seguridad de RefreshTokens
**Decisión:** Hashear refreshTokens antes de guardar en BD
**Razón:** Si hay breach de BD, los tokens no son usables
**Implementación:**
const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
await this.prisma.user.update({
where: { id: user.id },
data: { refreshToken: hashedRefreshToken }
});

#### Helmet + ESLint
**Problema:** ESLint warning con dynamic import de Helmet
**Solución:** Usar `require()` dentro de función:
async function bootstrap() {
const helmet = require('helmet');
app.use(helmet());
}

#### Bcrypt Salt Rounds
**Configuración:** 10 rounds (balance seguridad/performance)
**Tiempo aproximado:** ~100ms por hash
**Recomendación OWASP:** Mínimo 10 rounds

---

### 🧪 Testing Manual en Swagger

**Secuencia de pruebas:**
1. POST /auth/register → Guardar accessToken
2. Click "Authorize" → Pegar token
3. GET /users/me → Verificar 200
4. PATCH /users/me → Actualizar nombre
5. POST /auth/logout → Verificar invalidación
6. GET /users/me → Verificar 401 (token válido pero refreshToken null)
7. POST /auth/refresh → Renovar tokens
8. POST /auth/login → Login existente

---

### 🚀 Próximos Pasos

**Día 2 (Planificado):**
- Seed de 29 categorías predefinidas
- Módulo Accounts con CRUD completo
- Migraciones de Prisma para enums

**Módulos Pendientes:**
- Transactions (Acto 2)
- Categories endpoints (Acto 2)
- Budgets (Acto 3)
- Analytics (Acto 3)

---

### 📊 Métricas del Acto 1

| Métrica | Valor |
|---------|-------|
| Endpoints implementados | 6 |
| Modelos Prisma | 5 |
| Guards personalizados | 1 |
| Decorators personalizados | 1 |
| Exception filters | 1 |
| Tiempo desarrollo | ~4 horas |
| Líneas de código | ~800 |

---

### 🔑 Comandos Útiles

Desarrollo
npm run start:dev

Prisma
npx prisma generate
npx prisma migrate dev
npx prisma studio

Docker
docker-compose up -d
docker-compose down

Testing manual
http://localhost:3000/api/docs

---

### ✅ Checklist de Completitud

- [x] Auth register con hash de passwords
- [x] Auth login con validación bcrypt
- [x] Refresh token functionality
- [x] Logout con invalidación de tokens
- [x] JWT Guard funcional
- [x] Current user decorator
- [x] Exception filter global
- [x] Swagger documentation completa
- [x] Validaciones exhaustivas en DTOs
- [x] Users CRUD básico

**Estado:** ✅ Acto 1 COMPLETO y funcional

---

## 🎯 Acto 2: Core Financiero (Accounts, Transactions, Categories)

### Día 2 - 30/11/2025 al 01/12/2025

---

## Módulo Accounts (5 endpoints)

### 1. POST /accounts
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Crear nueva cuenta bancaria
- Balance inicial opcional (default: 0)
- Validación de tipo de cuenta (enum)

**Request:**
{
"name": "Cuenta Corriente BBVA",
"type": "BANK",
"currency": "EUR",
"color": "#4ECDC4",
"icon": "💳",
"initialBalance": 1000.50
}

**Response (201):**
{
"success": true,
"data": {
"id": "uuid",
"userId": "uuid",
"name": "Cuenta Corriente BBVA",
"type": "BANK",
"balance": 1000.50,
"currency": "EUR",
"color": "#4ECDC4",
"icon": "💳",
"isActive": true,
"createdAt": "2025-11-30T10:00:00.000Z"
},
"message": "Account created successfully"
}

**Validaciones:**
- name: max 100 caracteres
- type: AccountType enum (BANK, CASH, CREDIT_CARD, SAVINGS, INVESTMENT)
- currency: código ISO 3 letras
- initialBalance: opcional, positivo, max 2 decimales

---

### 2. GET /accounts
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Lista todas las cuentas del usuario autenticado
- Incluye balance actualizado en tiempo real
- Ordenadas por fecha de creación DESC

**Response (200):**
{
"success": true,
"data": [
{
"id": "uuid",
"name": "Cuenta Corriente BBVA",
"type": "BANK",
"balance": 1000.50,
"currency": "EUR",
"color": "#4ECDC4",
"icon": "💳",
"isActive": true
}
]
}

---

### 3. GET /accounts/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Obtiene detalle de una cuenta específica
- Validación de ownership (403 si no es del usuario)

**Response (200):**
{
"success": true,
"data": {
"id": "uuid",
"name": "Cuenta Corriente BBVA",
"type": "BANK",
"balance": 1000.50,
"currency": "EUR",
"color": "#4ECDC4",
"icon": "💳",
"isActive": true,
"createdAt": "2025-11-30T10:00:00.000Z",
"updatedAt": "2025-11-30T10:00:00.000Z"
}
}

---

### 4. PATCH /accounts/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Actualiza datos de la cuenta
- NO permite modificar balance directamente
- Validación de ownership

**Request:**
{
"name": "Cuenta Ahorro BBVA",
"color": "#FF5733"
}

**Response (200):**
{
"success": true,
"data": {
"id": "uuid",
"name": "Cuenta Ahorro BBVA",
"color": "#FF5733",
"balance": 1000.50,
"updatedAt": "2025-11-30T14:30:00.000Z"
},
"message": "Account updated successfully"
}

---

### 5. GET /accounts/:id/balance
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Obtiene balance calculado en tiempo real
- Balance = SUM(transactions WHERE accountId)
- No usa campo `initialBalance` (decidimos no implementarlo)

**Response (200):**
{
"success": true,
"data": {
"accountId": "uuid",
"balance": 1450.75,
"currency": "EUR",
"lastUpdated": "2025-11-30T16:00:00.000Z"
}
}

---

## Módulo Transactions (7 endpoints)

### 1. POST /transactions
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Crea transacción (INCOME o EXPENSE)
- Actualiza balance de cuenta automáticamente
- Usa Prisma transactions con Serializable isolation level
- Valida category type match (INCOME transaction → INCOME category)

**Request:**
{
"accountId": "uuid",
"categoryId": "uuid",
"type": "EXPENSE",
"amount": 50.99,
"description": "Compra en supermercado",
"date": "2025-11-30T18:00:00Z",
"notes": "Pago con tarjeta débito",
"isRecurring": false
}

**Response (201):**
{
"success": true,
"data": {
"id": "uuid",
"accountId": "uuid",
"categoryId": "uuid",
"userId": "uuid",
"type": "EXPENSE",
"amount": 50.99,
"description": "Compra en supermercado",
"date": "2025-11-30T18:00:00.000Z",
"notes": "Pago con tarjeta débito",
"isRecurring": false,
"category": {
"name": "Alimentación",
"icon": "🍔",
"color": "#FF6B6B"
},
"account": {
"name": "Cuenta Corriente BBVA",
"type": "BANK",
"currency": "EUR"
},
"createdAt": "2025-11-30T18:02:00.000Z"
},
"message": "Transaction created successfully"
}

**Validaciones:**
- accountId: UUID válido, debe pertenecer al usuario
- categoryId: UUID válido, debe existir
- type: TransactionType enum (INCOME, EXPENSE)
- amount: positivo, max 2 decimales
- description: max 500 caracteres
- date: formato ISO 8601, NO puede ser futura (custom validator IsNotFutureDate)
- notes: opcional, max 1000 caracteres

**Lógica de Balance:**
// EXPENSE: balance -= amount
// INCOME: balance += amount
await tx.account.update({
where: { id: dto.accountId },
data: {
balance: {
increment: balanceChange // Positivo para INCOME, negativo para EXPENSE
}
}
});

---

### 2. GET /transactions
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Lista transacciones del usuario con paginación
- Filtros opcionales: type, categoryId, accountId, startDate, endDate
- Ordenadas por date DESC

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `type` (INCOME | EXPENSE)
- `categoryId` (UUID)
- `accountId` (UUID)
- `startDate` (ISO 8601)
- `endDate` (ISO 8601)

**Response (200):**
{
"success": true,
"data": [
{
"id": "uuid",
"type": "EXPENSE",
"amount": 50.99,
"description": "Compra en supermercado",
"date": "2025-11-30T18:00:00.000Z",
"category": {
"name": "Alimentación",
"icon": "🍔"
},
"account": {
"name": "Cuenta Corriente BBVA"
}
}
],
"meta": {
"page": 1,
"limit": 20,
"total": 45,
"totalPages": 3
}
}

---

### 3. GET /transactions/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Obtiene detalle de una transacción
- Validación de ownership (403 si no pertenece al usuario)

**Response (200):**
{
"success": true,
"data": {
"id": "uuid",
"accountId": "uuid",
"categoryId": "uuid",
"type": "EXPENSE",
"amount": 50.99,
"description": "Compra en supermercado",
"date": "2025-11-30T18:00:00.000Z",
"notes": "Pago con tarjeta débito",
"isRecurring": false,
"category": {
"name": "Alimentación",
"icon": "🍔",
"color": "#FF6B6B",
"type": "EXPENSE"
},
"account": {
"name": "Cuenta Corriente BBVA",
"type": "BANK",
"currency": "EUR"
},
"createdAt": "2025-11-30T18:02:00.000Z",
"updatedAt": "2025-11-30T18:02:00.000Z"
}
}

---

### 4. PATCH /transactions/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Actualiza transacción existente
- Recalcula balance automáticamente (reversa antiguo + aplica nuevo)
- Maneja cambio de account (si se mueve la transacción)
- Usa Prisma transactions para atomicidad

**Request:**
{
"amount": 55.00,
"description": "Compra en supermercado (actualizado)"
}

**Response (200):**
{
"success": true,
"data": {
"id": "uuid",
"amount": 55.00,
"description": "Compra en supermercado (actualizado)",
"updatedAt": "2025-11-30T19:00:00.000Z"
},
"message": "Transaction updated successfully"
}

**Lógica de Balance (Update):**
// 1. Reversar impacto anterior en account vieja
await tx.account.update({
where: { id: oldAccountId },
data: { balance: { decrement: oldBalanceChange } }
});

// 2. Aplicar nuevo impacto en account nueva (o misma)
await tx.account.update({
where: { id: newAccountId },
data: { balance: { increment: newBalanceChange } }
});

---

### 5. DELETE /transactions/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Elimina transacción (hard delete)
- Revierte impacto en balance automáticamente
- Validación de ownership

**Response (200):**
{
"success": true,
"message": "Transaction deleted successfully"
}

**Lógica de Balance (Delete):**
// EXPENSE eliminado: balance += amount (devolver dinero)
// INCOME eliminado: balance -= amount (quitar dinero)
const balanceChange = transaction.type === 'INCOME'
? amount.negated()
: amount;

await tx.account.update({
where: { id: transaction.accountId },
data: { balance: { increment: balanceChange } }
});

---

### 6. GET /transactions/search
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Búsqueda full-text en description y notes
- Case-insensitive (Prisma mode: 'insensitive')
- Paginación incluida

**Query Params:**
- `query` (required): texto a buscar
- `page` (default: 1)
- `limit` (default: 20)

**Response (200):**
{
"success": true,
"data": [
{
"id": "uuid",
"description": "Compra en supermercado",
"amount": 50.99,
"date": "2025-11-30T18:00:00.000Z"
}
],
"meta": {
"page": 1,
"limit": 20,
"total": 3,
"totalPages": 1
}
}

---

### 7. POST /transactions/bulk
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Importación masiva de transacciones (útil para CSVs)
- Máximo 100 transacciones por request
- Todas se procesan en una sola transaction atómica
- Si falla una, rollback completo

**Request:**
{
"transactions": [
{
"accountId": "uuid",
"categoryId": "uuid",
"type": "EXPENSE",
"amount": 10.50,
"description": "Café",
"date": "2025-11-30T08:00:00Z"
},
{
"accountId": "uuid",
"categoryId": "uuid",
"type": "EXPENSE",
"amount": 25.00,
"description": "Almuerzo",
"date": "2025-11-30T13:00:00Z"
}
]
}

**Response (201):**
{
"success": true,
"data": [
{ "id": "uuid-1", "description": "Café", "amount": 10.50 },
{ "id": "uuid-2", "description": "Almuerzo", "amount": 25.00 }
],
"count": 2
}

**Validaciones:**
- Array max 100 elementos
- Cada transaction validada con CreateTransactionDto
- Todas las accountIds deben pertenecer al usuario

---

## Módulo Categories (6 endpoints)

### 1. GET /categories
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Lista categorías: defaults del sistema + custom del usuario
- Defaults son read-only (isDefault=true, userId=null)
- Ordenadas por: defaults primero, luego custom alfabéticamente
- Filtro opcional por type (INCOME | EXPENSE)

**Query Params:**
- `type` (opcional): INCOME | EXPENSE

**Response (200):**
{
"success": true,
"data": [
{
"id": "uuid",
"name": "Salario",
"icon": "💰",
"color": "#00B894",
"type": "INCOME",
"isDefault": true,
"createdAt": "2025-11-29T13:46:15.888Z"
},
{
"id": "uuid",
"name": "Streaming Services",
"icon": "📺",
"color": "#E50914",
"type": "EXPENSE",
"isDefault": false,
"createdAt": "2025-11-30T20:00:00.000Z"
}
],
"count": 29
}

---

### 2. POST /categories
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Crea categoría personalizada del usuario
- Validación de nombre único por usuario
- Icon y color opcionales (defaults si no se proveen)

**Request:**
{
"name": "Suscripciones Streaming",
"type": "EXPENSE",
"icon": "📺",
"color": "#E50914"
}

**Response (201):**
{
"success": true,
"data": {
"id": "uuid",
"userId": "uuid",
"name": "Suscripciones Streaming",
"icon": "📺",
"color": "#E50914",
"type": "EXPENSE",
"isDefault": false,
"createdAt": "2025-12-01T10:00:00.000Z"
},
"message": "Category created successfully"
}

**Validaciones:**
- name: max 50 caracteres, único por usuario
- type: CategoryType enum (INCOME, EXPENSE)
- icon: max 10 caracteres (emoji)
- color: formato hex (#RRGGBB)

---

### 3. GET /categories/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Obtiene detalle de categoría
- Accesible si es default O custom del usuario

**Response (200):**
{
"success": true,
"data": {
"id": "uuid",
"name": "Suscripciones Streaming",
"icon": "📺",
"color": "#E50914",
"type": "EXPENSE",
"isDefault": false,
"createdAt": "2025-12-01T10:00:00.000Z",
"updatedAt": "2025-12-01T10:00:00.000Z"
}
}

---

### 4. PATCH /categories/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Actualiza SOLO categorías custom del usuario
- Defaults son read-only (403 Forbidden si se intenta)

**Request:**
{
"name": "Streaming Services",
"color": "#FF0000"
}

**Response (200):**
{
"success": true,
"data": {
"id": "uuid",
"name": "Streaming Services",
"color": "#FF0000",
"updatedAt": "2025-12-01T11:00:00.000Z"
},
"message": "Category updated successfully"
}

**Validaciones:**
- Si `isDefault=true`: ForbiddenException
- Si `userId != currentUser.id`: ForbiddenException
- Nombre único si cambia

---

### 5. DELETE /categories/:id
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Elimina SOLO categorías custom sin transactions activas
- Defaults no se pueden eliminar
- Si tiene transactions activas: 409 Conflict

**Response (200):**
{
"success": true,
"message": "Category deleted successfully"
}

**Response (409 si tiene transactions):**
{
"statusCode": 409,
"message": "Cannot delete category "Streaming Services" because it has 5 transaction(s) associated with it",
"error": "ConflictException"
}

---

### 6. GET /categories/:id/stats
**Protegido:** Requiere JWT accessToken

**Funcionalidad:**
- Estadísticas de uso de la categoría
- Periodos: MONTH, YEAR, ALL, CUSTOM
- Solo cuenta transactions del usuario

**Query Params:**
- `period` (default: ALL): MONTH | YEAR | ALL | CUSTOM
- `startDate` (si period=CUSTOM): ISO 8601
- `endDate` (si period=CUSTOM): ISO 8601

**Response (200):**
{
"success": true,
"data": {
"categoryId": "uuid",
"categoryName": "Alimentación",
"categoryType": "EXPENSE",
"period": "MONTH",
"stats": {
"totalAmount": 450.75,
"transactionCount": 23,
"averageAmount": 19.60
}
}
}

**Cálculo de Períodos:**
- MONTH: primero a último día del mes actual
- YEAR: 1 enero a 31 diciembre del año actual
- ALL: sin filtro de fechas
- CUSTOM: entre startDate y endDate (ambos requeridos)

---

## 🛠️ Implementaciones Técnicas Clave

### Ownership Validation Pattern

**Problema:** Cada endpoint debe verificar que el recurso pertenece al usuario autenticado.

**Solución:** Método helper reutilizable en services:

private async validateAccountOwnership(
userId: string,
accountId: string
): Promise<void> {
const account = await this.prisma.account.findUnique({
where: { id: accountId },
select: { userId: true }
});

if (!account) {
throw new NotFoundException(Account with ID ${accountId} not found);
}

if (account.userId !== userId) {
throw new ForbiddenException('Access denied to this account');
}
}

**Usado en:** Todos los endpoints de accounts, transactions, categories.

---

### Atomic Balance Updates con Prisma Transactions

**Problema:** Race conditions al actualizar balance + crear transaction simultáneamente.

**Solución:** Prisma interactive transactions con Serializable isolation level:

const result = await this.prisma.$transaction(
async (tx) => {
// 1. Crear transaction
const transaction = await tx.transaction.create({ data: {...} });

// 2. Actualizar balance
await tx.account.update({
where: { id: dto.accountId },
data: { balance: { increment: balanceChange } }
});

return transaction;
},
{
isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
}
);

**Garantiza:** Atomicidad total, sin balances inconsistentes.

---

### Custom Validators con class-validator

#### IsNotFutureDate Validator

**Ubicación:** `src/domains/transactions/validators/is-not-future-date.validator.ts`

**Problema:** Transactions no deben tener fechas futuras.

**Implementación:**

import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'IsNotFutureDate', async: false })
export class IsNotFutureDate implements ValidatorConstraintInterface {
validate(dateString: string): boolean {
const date = new Date(dateString);
const now = new Date();
date.setHours(23, 59, 59, 999); // Fin del día
return date <= now;
}

defaultMessage(): string {
return 'Transaction date cannot be in the future';
}
}

**Uso en DTO:**

@Validate(IsNotFutureDate)
date: string;

---

### Category Type Match Validation

**Problema Inicial:** Intentamos usar `@Validate(CategoryTypeMatch)` en el DTO, pero class-validator no soporta inyección de dependencias.

**Error obtenido:**
Cannot read properties of undefined (reading 'category')

**Solución Final:** Mover validación al service layer:

// En TransactionsService.create()
await this.validateCategoryTypeMatch(dto.categoryId, dto.type);

// Método helper
private async validateCategoryTypeMatch(
categoryId: string,
transactionType: TransactionType
): Promise<void> {
const category = await this.prisma.category.findUnique({
where: { id: categoryId },
select: { type: true, name: true }
});

if (!category) {
throw new NotFoundException(Category with ID ${categoryId} not found);
}

if (category.type !== transactionType) {
throw new BadRequestException(
Category type mismatch: "${category.name}" is a ${category.type} category, but you're trying to create a ${transactionType} transaction
);
}
}

**Aprendizaje:** Validaciones que requieren queries a BD deben ir en services, no en DTOs.

---

### Paginación Consistente

**Pattern establecido:**

interface PaginatedResponse<T> {
data: T[];
meta: {
page: number;
limit: number;
total: number;
totalPages: number;
};
}

**Implementación:**

const [items, total] = await Promise.all([
this.prisma.model.findMany({
where,
skip: (page - 1) * limit,
take: limit,
orderBy: { date: 'desc' }
}),
this.prisma.model.count({ where })
]);

return {
data: items,
meta: {
page,
limit,
total,
totalPages: Math.ceil(total / limit)
}
};

---

### Balance Calculation Strategy

**Decisión:** NO usar campo `initialBalance` en Account.

**Razón:**
- Balance = SUM(transactions) es más confiable
- Evita inconsistencias entre initialBalance y transactions
- Simplifica lógica de recalculation

**Implementación:**

async recalculateAccountBalance(accountId: string) {
const [incomeResult, expenseResult] = await Promise.all([
this.prisma.transaction.aggregate({
where: { accountId, type: TransactionType.INCOME },
_sum: { amount: true }
}),
this.prisma.transaction.aggregate({
where: { accountId, type: TransactionType.EXPENSE },
_sum: { amount: true }
})
]);

const totalIncome = incomeResult._sum.amount ?? new Decimal(0);
const totalExpense = expenseResult._sum.amount ?? new Decimal(0);
const calculatedBalance = totalIncome.minus(totalExpense);

await this.prisma.account.update({
where: { id: accountId },
data: { balance: calculatedBalance }
});

return calculatedBalance;
}

---

## 📚 Aprendizajes Clave

### Decimal Type en Prisma

**Problema:** JavaScript numbers tienen imprecisión con decimales financieros.

**Solución:** Usar `Decimal` type de Prisma:

import { Decimal } from '@prisma/client/runtime/library';

// En operaciones
const amount = new Decimal(dto.amount);
const result = balance.plus(amount); // NO usar + operator

// Al retornar
return {
amount: amount.toNumber() // Convertir solo al final
};

**Configuración en Schema:**
amount Decimal @db.Decimal(15, 2)

---

### Prisma Aggregate vs FindMany

**❌ MAL (fetchea todo, calcula en memoria):**
const transactions = await prisma.transaction.findMany({ where });
const total = transactions.reduce((sum, t) => sum + t.amount, 0);

**✅ BIEN (calcula en DB):**
const result = await prisma.transaction.aggregate({
where,
_sum: { amount: true },
_count: true
});
const total = result._sum.amount ?? new Decimal(0);

**Performance:** 100x más rápido con 10k+ transactions.

---

### Transaction Model con userId Directo

**Decisión:** Añadir `userId` field en Transaction model, además de `accountId`.

**Razón:**
- Queries de analytics más eficientes (no JOIN con Account)
- Simplifica ownership validation
- Índice directo: `@@index([userId, date, type])`

**Trade-off:** Redundancia de datos, pero justificada por performance.

---

### CurrentUser Decorator Enhancement

**Problema inicial:** `@CurrentUser('sub')` retornaba `undefined`.

**Causa:** JwtStrategy.validate() retornaba objeto user de BD (con `id`), no JWT payload (con `sub`).

**Solución:**

// En jwt.strategy.ts
async validate(payload: any) {
const user = await this.prisma.user.findUnique({
where: { id: payload.sub }
});

return {
sub: user.id, // Añadir campo 'sub'
id: user.id, // Mantener 'id' por compatibilidad
email: user.email,
// ... otros campos
};
}

**Ahora funciona:** `@CurrentUser('sub')` y `@CurrentUser('id')` ambos válidos.

---

## 🧪 Testing Manual - Secuencias Críticas

### Secuencia 1: Balance Tracking
1. POST /accounts → Balance inicial 1000
2. POST /transactions (INCOME, 500) → Balance = 1500
3. POST /transactions (EXPENSE, 200) → Balance = 1300
4. GET /accounts/:id/balance → Verificar 1300 ✅
5. PATCH /transactions/:id (EXPENSE, 250) → Balance = 1250
6. DELETE /transactions/:id (EXPENSE) → Balance = 1500
7. GET /accounts/:id/balance → Verificar 1500 ✅

### Secuencia 2: Ownership Validation
1. Login como User A
2. Crear Account A
3. Crear Transaction en Account A
4. Login como User B
5. GET /transactions/:id-de-user-a → Esperado: 403 Forbidden ✅
6. GET /accounts/:id-de-account-a → Esperado: 403 Forbidden ✅

### Secuencia 3: Category Type Match
1. GET /categories → Obtener ID de category "Salario" (INCOME)
2. POST /transactions con type=EXPENSE + categoryId de "Salario"
3. Esperado: 400 Bad Request con mensaje claro ✅

### Secuencia 4: Bulk Import
1. POST /transactions/bulk con 5 transactions
2. Verificar que todas se crean ✅
3. POST /transactions/bulk con 101 transactions
4. Esperado: 400 Bad Request (max 100) ✅
5. POST /transactions/bulk con 1 transaction inválida
6. Verificar rollback completo (0 creadas) ✅

### Secuencia 5: Categories CRUD
1. GET /categories → 29 defaults
2. POST /categories (custom) → 30 total
3. PATCH /categories/:id-default → Esperado: 403 Forbidden ✅
4. PATCH /categories/:id-custom → Success ✅
5. POST /transactions con custom category
6. DELETE /categories/:id-custom → Esperado: 409 Conflict ✅
7. DELETE transaction
8. DELETE /categories/:id-custom → Success ✅

---

## 📊 Métricas del Acto 2

| Métrica | Valor |
|---------|-------|
| Endpoints implementados | 18 (5+7+6) |
| Módulos nuevos | 3 |
| Custom validators | 2 |
| Prisma transactions usadas | 5 métodos |
| Ownership validations | 12 endpoints |
| Tiempo desarrollo | ~8 horas |
| Líneas de código | ~2100 |
| Categorías seed | 29 |

---

## 🔑 Comandos Útiles Adicionales

Seed de categorías
npx prisma db seed

Ver datos en UI
npx prisma studio

Formatear código
npm run format

Regenerar Prisma Client después de cambios en schema
npx prisma generate

---

## ✅ Checklist de Completitud

- [x] Accounts CRUD completo con balance tracking
- [x] Transactions CRUD con atomic balance updates
- [x] Bulk import de transactions (max 100)
- [x] Search transactions por descripción/notas
- [x] Categories CRUD con protección de defaults
- [x] Category stats con múltiples períodos
- [x] Ownership validation en todos los endpoints
- [x] Prisma transactions con Serializable isolation
- [x] Custom validators (IsNotFutureDate)
- [x] Paginación consistente con metadata
- [x] Decimal type para precisión financiera
- [x] Seed de 29 categorías ejecutado
- [x] Testing exhaustivo en Swagger

**Estado:** ✅ Acto 2 COMPLETO y funcional

---

## 🚀 Próximos Pasos (Acto 3)

**Planificado:**
- Módulo Budgets con progress tracking
- Módulo Analytics con dashboard
- Redis caching en analytics
- Database indexes para performance
- Trends y comparaciones temporales

**Módulos Pendientes:**
- Budgets (CRUD + progress calculation)
- Analytics (6 endpoints de métricas)

---

## Acto 3: Budgets, Analytics y Production Optimizations

### Día 11 - 08/12/2025: Budgets Module

**Completado:**
- ✅ Budgets CRUD completo (7 endpoints)
- ✅ Progress tracking con cálculo de spent vs limit
- ✅ Alert system (shouldAlert cuando >= threshold)
- ✅ Validación de períodos superpuestos
- ✅ Soft delete (isActive flag)

**Endpoints:**
POST /budgets // Crear presupuesto
GET /budgets // Listar activos
GET /budgets/:id // Detalle
PATCH /budgets/:id // Actualizar
DELETE /budgets/:id // Soft delete
GET /budgets/:id/progress // Calcular progreso actual
GET /budgets/overview // Dashboard con todos los budgets

**Lógica de Cálculo Automático de Fechas:**
calculateEndDate(startDate: Date, period: BudgetPeriod): Date {
const end = new Date(startDate);
switch (period) {
case 'WEEKLY':
end.setDate(end.getDate() + 7);
break;
case 'MONTHLY':
end.setMonth(end.getMonth() + 1);
break;
case 'YEARLY':
end.setFullYear(end.getFullYear() + 1);
break;
}
end.setHours(23, 59, 59, 999); // Fin del día
return end;
}

**Progress Calculation con Prisma Aggregations:**
const spent = await prisma.transaction.aggregate({
where: {
categoryId: budget.categoryId,
type: 'EXPENSE',
date: { gte: budget.startDate, lte: budget.endDate }
},
_sum: { amount: true }
});

const percentageUsed = (spent / budget.amount) * 100;
const shouldAlert = percentageUsed >= budget.alertThreshold;
const isOverBudget = spent > budget.amount;

**Validación de Períodos Superpuestos (Critical Business Logic):**
// Prevenir 2 budgets activos con misma categoría y períodos que se solapen
const overlapping = await prisma.budget.findFirst({
where: {
userId,
categoryId,
isActive: true,
OR: [
{
startDate: { lte: endDate },
endDate: { gte: startDate }
}
]
}
});

if (overlapping) {
throw new BadRequestException(
'Ya existe un presupuesto activo para esta categoría en el período especificado'
);
}

**Aprendizajes:**
- Soft delete (isActive flag) > hard delete para mantener historial
- Validación de overlapping periods requiere cuidado con edge cases (touch boundaries)
- Progress calculation debe ser real-time (no cached)

---

### Día 12 - 09/12/2025: Analytics Module (Complex Aggregations)

**Completado:**
- ✅ 7 endpoints de analytics con date range support
- ✅ Optimización con Prisma aggregations (no fetch all)
- ✅ Support para períodos predefinidos y custom ranges
- ✅ Breakdown detallado por categorías

**Endpoints:**
GET /analytics/overview // Dashboard con métricas principales
GET /analytics/spending // Análisis de gastos con breakdown
GET /analytics/income // Análisis de ingresos
GET /analytics/trends // Tendencias últimos N períodos
GET /analytics/categories // Distribución por categoría
GET /analytics/comparison // Comparar dos períodos

**Decisión Crítica: Aggregations Over Fetch All**

**❌ Approach Inicial (Ineficiente - NO usar):**
// Traer todas las transactions a memoria
const transactions = await prisma.transaction.findMany({
where: { userId, type: 'EXPENSE' }
});
const total = transactions.reduce((sum, t) => sum + t.amount.toNumber(), 0);
// Problema: Con 1000+ transactions, esto es lento y consume memoria

**✅ Approach Final (Optimizado - Production ready):**
// Aggregate directamente en database
const result = await prisma.transaction.aggregate({
where: { userId, type: 'EXPENSE' },
_sum: { amount: true },
_count: true,
_avg: { amount: true },
_max: { amount: true }
});
// Resultado: 1 query, 1 row retornada, 10-50x más rápido

**Performance Impact:** Queries pasaron de 500-2000ms a 50-150ms ⚡

**GroupBy para Breakdown por Categoría:**
// Step 1: Group transactions por categoría
const byCategory = await prisma.transaction.groupBy({
by: ['categoryId'],
where: {
userId,
type: 'EXPENSE',
date: { gte: startDate, lte: endDate }
},
_sum: { amount: true },
_count: true
});

// Step 2: Fetch categories metadata (1 query para todas)
const categoryIds = byCategory.map(bc => bc.categoryId);
const categories = await prisma.category.findMany({
where: { id: { in: categoryIds } }
});

// Step 3: Combinar resultados con percentage calculation
const totalExpenses = byCategory.reduce((sum, bc) => sum + bc._sum.amount, 0);
const result = byCategory.map(bc => ({
categoryId: bc.categoryId,
categoryName: categories.find(c => c.id === bc.categoryId)?.name,
spent: bc._sum.amount,
transactionCount: bc._count,
percentage: ((bc._sum.amount / totalExpenses) * 100).toFixed(2)
}));

**Edge Case: División por Cero (Critical for Production):**
// Savings rate calculation
const savingsRate = totalIncome === 0
? 0
: parseFloat(((netSavings / totalIncome) * 100).toFixed(2));
// Previene NaN o Infinity en el response

**Date Range Helper Functions:**
// Calcular rango según período predefinido
calculateDateRange(period: AnalyticsPeriod, referenceDate?: string) {
const now = referenceDate ? new Date(referenceDate) : new Date();

switch (period) {
case 'WEEK':
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - 7);
return { startDate: weekStart, endDate: now };

case 'MONTH':
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
return { startDate: monthStart, endDate: now };

case 'YEAR':
const yearStart = new Date(now.getFullYear(), 0, 1);
return { startDate: yearStart, endDate: now };

case 'CUSTOM':
// Requiere startDate y endDate explícitos
throw new BadRequestException('Custom period requires explicit dates');
}
}

**Aprendizajes:**
- Prisma aggregations son 10-50x más rápidas que fetch + reduce en memoria
- GroupBy + include de relations requiere 2 queries separadas (Prisma limitation)
- Edge cases de matemáticas (división por cero) deben manejarse explícitamente

---

### Día 13 - 10/12/2025: Database Optimization & Indexing Strategy

**Completado:**
- ✅ 16 strategic database indexes
- ✅ Query performance analysis
- ✅ Index selection basado en access patterns reales

**Problema Identificado:**
Analytics queries tomaban 2-5 segundos con 1000+ transactions. Causa: Full table scans sin indexes.

**Solución: Strategic Indexing**

model Transaction {
// ... campos

// Indexes para queries comunes
@@index([userId]) // Listar transactions del usuario
@@index([accountId]) // Transactions de una cuenta
@@index([categoryId]) // Transactions de categoría (budgets)
@@index([date]) // Ordenar/filtrar por fecha
@@index([userId, date, type]) // Analytics por período y tipo
@@index([categoryId, date, type]) // Budget progress calculation
@@index([userId, categoryId, date]) // Complex analytics queries
}

model Budget {
// ... campos

@@index([userId])
@@index([categoryId])
@@index([userId, isActive]) // Listar budgets activos
@@index([categoryId, startDate, endDate]) // Overlapping validation
}

model Account {
// ... campos

@@index([userId])
@@index([userId, isActive]) // Cuentas activas del usuario
@@index([userId, type]) // Filtrar por tipo de cuenta
}

model Category {
// ... campos

@@index([userId])
@@index([isDefault])
@@index([userId, type]) // User categories por tipo
}

**Migration Command:**
npx prisma migrate dev --name add_performance_indexes

Generated: prisma/migrations/TIMESTAMP_add_performance_indexes/

**Performance Impact:**
| Query | Sin Indexes | Con Indexes | Mejora |
|-------|-------------|-------------|--------|
| Analytics overview | 3500ms | 180ms | **19x** ⚡ |
| Budget progress | 850ms | 65ms | **13x** ⚡ |
| Spending by category | 2200ms | 120ms | **18x** ⚡ |

**Lección Aprendida:**
> Indexes no son gratis (cost en writes), pero en nuestro caso reads >> writes (ratio 10:1), así que el trade-off es worth it.

---

### Día 13 (continuación): Rate Limiting Strategy

**Completado:**
- ✅ Rate limiting diferenciado por endpoint sensitivity
- ✅ Configuración con `@nestjs/throttler`
- ✅ Custom limits por tipo de operación

**Problema:**
Sin rate limiting, API vulnerable a:
- Brute force attacks en login
- Spam en registration
- Abuse en analytics (queries costosos)

**Solución: Tiered Rate Limiting**

// app.module.ts - Global configuration
ThrottlerModule.forRoot([
{
name: 'short', // Endpoints sensibles (auth)
ttl: 60000, // 1 minuto
limit: 5, // 5 requests
},
{
name: 'medium', // Analytics (costosos)
ttl: 60000,
limit: 30,
},
{
name: 'long', // Resto de endpoints
ttl: 60000,
limit: 100,
},
])

**Aplicación por Controller:**

// Auth Controller - Más restrictivo
@Controller('auth')
@Throttle({ short: { limit: 5, ttl: 60000 } })
export class AuthController {
@Post('login') // Solo 5 intentos/minuto
async login() { ... }

@Post('register')
@Throttle({ short: { limit: 3, ttl: 600000 } }) // Override: 3/10min
async register() { ... }
}

// Analytics Controller - Restrictivo (queries costosos)
@Controller('analytics')
@Throttle({ medium: { limit: 30, ttl: 60000 } })
export class AnalyticsController {
@Get('overview') // 30 requests/minuto
async getOverview() { ... }
}

// Transactions Controller - Normal
@Controller('transactions')
@Throttle({ long: { limit: 100, ttl: 60000 } })
export class TransactionsController {
@Get() // 100 requests/minuto
async findAll() { ... }
}

**Headers de Rate Limiting (visibles en response):**
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1702388400

**Aprendizajes:**
- Rate limiting diferenciado > global único
- Headers informativos ayudan a clients a hacer backoff
- Throttler de NestJS se integra perfectamente con guards

---

### Día 13 (final): Date Range Validation & Security

**Completado:**
- ✅ Custom validator para rangos de fechas
- ✅ Límite máximo de 1 año (prevenir abuse)
- ✅ Validación de fechas futuras

**Problema:**
Sin validación, users podrían:
// ❌ Query abusivo: 50 años de datos
GET /analytics/spending?startDate=1970-01-01&endDate=2025-12-31
// Esto podría:
// - Timeout del query (>30s)
// - Crash de la app (out of memory)
// - Degradación para otros usuarios

**Solución: Custom Validator con Límite**

// date-range.validator.ts
@ValidatorConstraint({ name: 'isValidDateRange', async: false })
export class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
validate(endDate: any, args: ValidationArguments) {
const dto = args.object as any;
const startDate = dto.startDate;

if (!startDate || !endDate) return true; // Optional fields

const start = new Date(startDate);
const end = new Date(endDate);
const now = new Date();

// Validación 1: startDate no puede ser futuro
if (start > now) {
return false;
}

// Validación 2: endDate debe ser después de startDate
if (end <= start) {
return false;
}

// Validación 3: Rango máximo de 1 año (365 días)
const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 año en ms
const diff = end.getTime() - start.getTime();

if (diff > maxRange) {
return false;
}

return true;
}

defaultMessage(args: ValidationArguments) {
return 'El rango de fechas no puede exceder 1 año y la fecha final debe ser posterior a la inicial';
}
}

// Decorator para usar en DTOs
export function IsValidDateRange(validationOptions?: ValidationOptions) {
return function (object: Object, propertyName: string) {
registerDecorator({
target: object.constructor,
propertyName: propertyName,
options: validationOptions,
constraints: [],
validator: IsValidDateRangeConstraint,
});
};
}

**Uso en DTOs:**

// analytics-period.dto.ts
export class AnalyticsPeriodDto {
@ApiPropertyOptional({
enum: ['WEEK', 'MONTH', 'YEAR', 'CUSTOM'],
default: 'MONTH'
})
@IsOptional()
@IsEnum(AnalyticsPeriod)
period?: AnalyticsPeriod = AnalyticsPeriod.MONTH;

@ApiPropertyOptional({
description: 'Start date for custom period (ISO 8601)'
})
@IsOptional()
@IsDateString()
startDate?: string;

@ApiPropertyOptional({
description: 'End date for custom period. Max 1 year from startDate'
})
@IsOptional()
@IsDateString()
@IsValidDateRange() // ← Custom validator aplicado
endDate?: string;
}

**Validación en Service Layer (defense in depth):**

// analytics.service.ts
validateDateRange(startDate: Date, endDate: Date) {
const now = new Date();

if (startDate > now) {
throw new BadRequestException('La fecha inicial no puede ser futura');
}

if (endDate <= startDate) {
throw new BadRequestException('La fecha final debe ser posterior a la inicial');
}

const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 año
const diff = endDate.getTime() - startDate.getTime();

if (diff > maxRange) {
throw new BadRequestException('El rango de fechas no puede exceder 1 año (365 días)');
}
}

**Por qué 1 año es el límite:**
- Balance entre usabilidad y performance
- Queries de 1 año con indexes: ~150-300ms (acceptable)
- Queries de 5 años: ~2-5s (timeout risk)
- Users raramente necesitan > 1 año en single query

**Aprendizajes:**
- Validación multi-layer: DTO + Service
- Custom validators de class-validator son poderosos
- Límites arbitrarios pero razonables previenen abuse

---

### Día 14 - 11/12/2025: Compression & Security Headers

**Completado:**
- ✅ Response compression con gzip
- ✅ Helmet security headers configurados
- ✅ Compatibility con Swagger UI

**Problema 1: Large Response Sizes**
GET /analytics/overview
Response sin compression: 45 KB
Bandwidth cost en 10K requests/día: ~450 MB/día

**Solución: Compression Middleware**

// main.ts
import compression from 'compression';
import { Request, Response } from 'express';

app.use(
compression({
filter: (req: Request, res: Response) => {
// No comprimir si cliente lo solicita
if (req.headers['x-no-compression']) {
return false;
}
// Usar función default de compression
return compression.filter(req, res);
},
level: 6, // Nivel de compresión (0-9, default: 6)
threshold: 1024, // Solo comprimir responses > 1KB
}),
);

**Impact:**
| Endpoint | Sin Compression | Con Compression | Ahorro |
|----------|----------------|-----------------|--------|
| GET /analytics/overview | 45 KB | 8 KB | 82% ⚡ |
| GET /transactions?limit=100 | 250 KB | 35 KB | 86% ⚡ |

**Por qué threshold = 1KB:**
- Responses < 1KB no vale la pena comprimir (overhead > benefit)
- Compression CPU cost insignificante en modern servers
- Bandwidth savings massive en production

---

**Problema 2: Security Headers Faltantes**

**Test inicial con securityheaders.com:**
❌ Missing: Content-Security-Policy
❌ Missing: X-Content-Type-Options
❌ Missing: X-Frame-Options
❌ Missing: Strict-Transport-Security
Score: F (antes de Helmet)

**Solución: Helmet con Config Custom**

// main.ts
import helmet from 'helmet';

app.use(
helmet({
contentSecurityPolicy: {
directives: {
defaultSrc: ['self'],
styleSrc: ['self', 'unsafe-inline'],
imgSrc: ['self', 'data:', 'https:'],
scriptSrc: ['self', 'unsafe-inline', 'unsafe-eval'], // Para Swagger
},
},
crossOriginEmbedderPolicy: false, // Swagger compatibility
crossOriginResourcePolicy: { policy: 'cross-origin' }, // Swagger assets
}),
);

**Desafío Técnico: Helmet Rompía Swagger UI** 🔥

**Problema inicial:**
// ❌ Config default de Helmet
app.use(helmet());

// Resultado:
// - Swagger UI no carga (CSP blocks scripts)
// - Console errors: "Refused to execute inline script"

**Debugging process:**
1. Identificar que Helmet bloqueaba scripts de Swagger
2. Research sobre CSP directives necesarias
3. Iteración sobre config hasta encontrar balance seguridad/funcionalidad

**Solución final:**
contentSecurityPolicy: {
directives: {
scriptSrc: ['self', 'unsafe-inline', 'unsafe-eval'], // ✅ Permite Swagger
},
},
crossOriginEmbedderPolicy: false, // ✅ Swagger assets externos

**Tiempo invertido en este issue:** 2 horas (vale la pena para production-ready)

**Security Headers Resultantes:**
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
Strict-Transport-Security: max-age=15552000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: no-referrer

**Test final con securityheaders.com:**
✅ Content-Security-Policy: Present
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: SAMEORIGIN
✅ Strict-Transport-Security: Present
Score: A (después de Helmet)

**Aprendizajes:**
- Helmet default config puede romper Swagger → config custom necesario
- CSP es poderoso pero requiere tuning
- Security headers mejoran score de herramientas de auditoría

---

### Día 14 (final): Paginación Consistente

**Completado:**
- ✅ Paginación offset-based en GET /transactions
- ✅ Metadata completo en responses
- ✅ Validación de límites (max 100 items/page)

**Pagination DTO:**

// pagination.dto.ts
export class PaginationDto {
@ApiPropertyOptional({
description: 'Page number (1-indexed)',
minimum: 1,
default: 1,
example: 1
})
@IsOptional()
@Type(() => Number)
@IsNumber()
@Min(1)
page?: number = 1;

@ApiPropertyOptional({
description: 'Items per page',
minimum: 1,
maximum: 100,
default: 20,
example: 20
})
@IsOptional()
@Type(() => Number)
@IsNumber()
@Min(1)
@Max(100) // ← Prevenir abuse (no permitir limit=10000)
limit?: number = 20;
}

**Response Structure Estándar:**

// Todos los endpoints paginados retornan este formato
{
"success": true,
"data": [...], // Array de items
"meta": {
"page": 1, // Current page
"limit": 20, // Items per page
"total": 145, // Total items in DB
"totalPages": 8, // Math.ceil(total / limit)
"hasNext": true, // page < totalPages
"hasPrevious": false // page > 1
}
}

**Implementation en Service:**

// transactions.service.ts
async findAll(userId: string, paginationDto: PaginationDto) {
const { page = 1, limit = 20 } = paginationDto;

// Calcular offset
const skip = (page - 1) * limit;

// Query con pagination
const [transactions, total] = await Promise.all([
this.prisma.transaction.findMany({
where: { userId },
skip,
take: limit,
orderBy: { date: 'desc' },
include: {
category: true,
account: { select: { name: true, type: true } }
}
}),
this.prisma.transaction.count({
where: { userId }
})
]);

// Metadata calculation
const totalPages = Math.ceil(total / limit);
const hasNext = page < totalPages;
const hasPrevious = page > 1;

return {
success: true,
data: transactions,
meta: {
page,
limit,
total,
totalPages,
hasNext,
hasPrevious
}
};
}

**Por qué limit=100 es el máximo:**
- Prevenir queries abusivos (limit=10000)
- Balance entre usability y performance
- Respuestas de 100 items: ~25-50KB (aceptable)
- Respuestas de 1000 items: ~250-500KB (demasiado)

**Aprendizajes:**
- Offset pagination es simple y suficiente para MVP
- Cursor-based pagination es mejor para infinite scroll (future feature)
- `Promise.all()` para fetch data + count en paralelo

---

## Desafíos Técnicos del Acto 3

### 1. Compression + Helmet Compatibility ⭐⭐⭐⭐
**Tiempo invertido:** 2 horas  
**Dificultad:** Media-Alta

**Problema:**
// Import conflict entre compression types
import * as compression from 'compression'; // ❌ Causaba errores de tipos

**Solución:**
import compression from 'compression'; // ✅ Default import
import { Request, Response } from 'express'; // ✅ Tipos explícitos

app.use(
compression({
filter: (req: Request, res: Response) => { // ✅ Tipos correctos
// ...
}
})
);

**Lección:** TypeScript module resolution puede ser tricky. Default imports > namespace imports para algunas librerías.

---

### 2. Date Range Validation Edge Cases ⭐⭐⭐⭐⭐
**Tiempo invertido:** 3 horas  
**Dificultad:** Alta

**Edge cases descubiertos:**

// Case 1: Timezone issues
startDate: "2025-12-01" // ← ¿Qué timezone?
// Solución: Forzar ISO 8601 con timezone (2025-12-01T00:00:00.000Z)

// Case 2: End of day ambiguity
endDate: "2025-12-31" // ← ¿00:00 o 23:59:59?
// Solución: Normalizar a end of day (setHours(23, 59, 59, 999))

// Case 3: Leap years
startDate: "2024-02-29" // ← Válido en 2024
endDate: "2025-02-29" // ← Inválido en 2025
// Solución: Date constructor maneja esto automáticamente

// Case 4: Period=CUSTOM sin fechas
period: "CUSTOM" // ← Pero sin startDate/endDate
// Solución: Validación explícita en service layer
if (period === 'CUSTOM' && (!startDate || !endDate)) {
throw new BadRequestException('Custom period requires both dates');
}

**Lección:** Date handling es más complejo de lo que parece. Siempre validar en múltiples layers (DTO + Service).

---

### 3. Analytics Performance Degradation ⭐⭐⭐⭐⭐
**Tiempo invertido:** 6 horas (including research)  
**Dificultad:** Alta

**Problema inicial:**
// Query tomaba 5+ segundos con 1000 transactions
const transactions = await prisma.transaction.findMany({
where: { userId, date: { gte, lte } }
});
// Luego calcular en memoria...

**Approach 1 (failed):**
// Intentar agregar index solo en date
@@index([date]) // ❌ No suficiente (still slow)

**Approach 2 (better but not optimal):**
// Composite index
@@index([userId, date]) // ✅ Better (2s → 800ms)

**Approach 3 (optimal):**
// Composite index + aggregation
@@index([userId, date, type]) // ✅ Optimal index

// Usar aggregation en vez de fetch all
const result = await prisma.transaction.aggregate({
where: { userId, type: 'EXPENSE', date: { gte, lte } },
_sum: { amount: true }
});
// Resultado: 5s → 150ms (33x faster!)

**Lección:** Performance optimization es iterativo. Combine indexes + query optimization para máximo impact.

---

## Métricas de Performance: Antes vs Después

| Endpoint | Sin Optimizaciones | Con Optimizaciones | Mejora |
|----------|-------------------|-------------------|--------|
| GET /analytics/overview | 3500ms | 180ms | **19x** ⚡ |
| GET /analytics/spending | 2200ms | 120ms | **18x** ⚡ |
| GET /budgets/:id/progress | 850ms | 65ms | **13x** ⚡ |
| GET /transactions?limit=100 | 450ms | 85ms | **5x** ⚡ |
| POST /transactions (atomic) | 180ms | 150ms | 1.2x ✅ |

**Optimizaciones aplicadas:**
1. ✅ 16 database indexes
2. ✅ Prisma aggregations (no fetch all)
3. ✅ Gzip compression (82% bandwidth reduction)
4. ✅ Rate limiting (prevenir abuse)
5. ✅ Date range validation (max 1 año)
6. ✅ Security headers (Helmet)

**Bandwidth Savings:**
- Analytics responses: 45 KB → 8 KB (82% reduction)
- Transactions list: 250 KB → 35 KB (86% reduction)
- **Estimated savings:** ~500 GB/mes en 1M requests

---

## Decisiones de Arquitectura Críticas

### 1. Aggregations en Database, No en Application

**Razón:**
- Database es 10-50x más rápido para aggregations
- Reduce network transfer (solo resultado final)
- Escala mejor (DB optimizado para estas operaciones)

**Trade-off:**
- Queries más complejas de escribir
- Pero DX de Prisma es excelente

---

### 2. Rate Limiting Diferenciado por Endpoint

**Razón:**
- No todos los endpoints son iguales
- Auth endpoints necesitan más protección (brute force)
- Analytics son costosos → límites más bajos
- CRUD normal puede tener límites más altos

**Trade-off:**
- Más configuración inicial
- Pero previene abuse efectivamente

---

### 3. Validación de Date Ranges con Límite de 1 Año

**Razón:**
- Balance entre usability y performance
- Queries de 1 año: ~150ms (acceptable)
- Queries de 10 años: ~5s (timeout risk)
- Users raramente necesitan > 1 año en single query

**Trade-off:**
- Limitación artificial
- Pero previene abuse y garantiza buena UX

---

### 4. Compression Threshold de 1KB

**Razón:**
- Responses < 1KB: overhead de compression > benefit
- Responses > 1KB: savings significativos
- CPU cost de compression es negligible

**Trade-off:**
- Respuestas pequeñas no se comprimen
- Pero es el behavior correcto

---

## Reflexión del Acto 3

El Acto 3 fue el más **técnicamente demandante** pero también el más **gratificante** porque:

1. **Optimización es arte:** Encontrar el balance entre performance y complexity
2. **Production-ready significa anticipar:** Rate limiting, validation, security
3. **Iteración funciona:** Compression fix tomó 3 intentos hasta funcionar con Swagger
4. **Documentación paga:** Estos desafíos serán útiles para futuros projects

**Tiempo total Acto 3:** 28 horas (~7 horas/día durante 4 días)

**Breakdown:**
- Budgets module: 6 horas
- Analytics module: 8 horas
- Optimizations (indexes, rate limiting, compression, helmet): 10 horas
- Paginación y validaciones: 4 horas

**¿Valió la pena?** Absolutamente. La API ahora es **production-ready de verdad**, no solo "funciona en mi laptop".

### Lo Que Aprendí en el Acto 3

1. **Performance is a feature:** Users perciben diferencia entre 200ms vs 2s
2. **Security by default:** Rate limiting, input validation, security headers desde el inicio
3. **TypeScript type safety ahorra tiempo:** Bugs prevenidos en compile time > runtime debugging
4. **Database optimization es crítico:** Indexes bien diseñados = queries 10-50x más rápidas
5. **Edge cases importan:** División por cero, timezones, leap years - todos causan bugs reales

### Skills Desarrolladas

**Técnicas:**
- ✅ Database indexing strategy
- ✅ Query optimization (aggregations, groupBy)
- ✅ Rate limiting configuration
- ✅ Security headers (Helmet + CSP)
- ✅ Response compression
- ✅ Custom validators (class-validator)
- ✅ Performance profiling

**Soft Skills:**
- ✅ Debugging sistemático (Helmet + Swagger issue)
- ✅ Trade-off analysis (performance vs complexity)
- ✅ Security mindset (defense in depth)
- ✅ Documentation discipline

---

**Última actualización:** 12 diciembre 2025  
**Status Acto 3:** Completado ✅ Production-ready  
**Siguiente:** Acto 4 (Testing + Deployment)

## Acto 4: E2E Testing & Production Deployment

### Día 14 - 14/12/2025: E2E Testing Setup & Critical Test Suites

**Completado:**
- ✅ Jest E2E configuration con test database
- ✅ Test helpers class (TestHelpers)
- ✅ Database cleanup automático (beforeEach/afterAll)
- ✅ 22 E2E tests passing (6 test suites)
- ✅ Railway deployment con PostgreSQL + Redis managed
- ✅ Health check endpoint funcional
- ✅ Swagger documentation en producción

---

### Testing Infrastructure Setup

**Archivo: `test/jest-e2e.json`**

{
"moduleFileExtensions": ["js", "json", "ts"],
"rootDir": ".",
"testEnvironment": "node",
"testRegex": ".e2e-spec.ts$",
"transform": {
"^.+\.(t|j)s$": "ts-jest"
},
"moduleNameMapper": {
"^src/(.*)$": "<rootDir>/../src/$1"
},
"setupFilesAfterEnv": ["<rootDir>/setup.ts"],
"testTimeout": 30000,
"maxWorkers": 1,
"forceExit": true,
"detectOpenHandles": true
}

**Decisión Crítica: `maxWorkers: 1`**
- **Razón:** Prevenir race conditions en test database
- **Trade-off:** Tests más lentos (11.47s total) pero estables
- **Alternativa descartada:** Parallel tests con isolated databases (over-engineering para MVP)

---

**Archivo: `test/setup.ts` - Database Cleanup Automático**

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
datasources: {
db: {
url: process.env.DATABASE_URL,
},
},
});

beforeEach(async () => {
console.log('🧹 Cleaning test database...');

// Orden correcto por foreign keys
await prisma.transaction.deleteMany();
await prisma.budget.deleteMany();
await prisma.category.deleteMany();
await prisma.account.deleteMany();
await prisma.refreshToken.deleteMany();
await prisma.blacklistedToken.deleteMany();
await prisma.user.deleteMany();

console.log('✅ Test database cleaned');
});

afterAll(async () => {
console.log('🔌 Disconnecting Prisma...');
await prisma.$disconnect();
});

**Lección Aprendida:**
> Order matters en `deleteMany()`. Deletear en orden reverso de foreign keys previene errores de constraint violations.

**Error Inicial (antes de fix):**
Foreign key constraint failed on the field: Transaction_accountId_fkey

**Solución:**
// ✅ Orden correcto: children first, parents last
await prisma.transaction.deleteMany(); // Hijo
await prisma.account.deleteMany(); // Padre

---

### Test Helpers Class (Reutilizable)

**Archivo: `test/helpers/test-helpers.ts`**

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

type AuthResult = {
accessToken: string;
refreshToken?: string;
user: { id: string; email: string };
};

export class TestHelpers {
constructor(private readonly app: INestApplication) {}

private http() {
return request(this.app.getHttpServer());
}

// ---- AUTH ----
async registerUser(userData: Partial<{
email: string;
password: string;
firstName: string;
lastName: string;
}> = {}) {
const email = userData.email || e2e_${Date.now()}@test.com;
const password = userData.password || 'Test123!';
const firstName = userData.firstName || 'E2E';
const lastName = userData.lastName || 'User';

const registerRes = await this.http()
.post('/api/v1/auth/register')
.send({ email, password, firstName, lastName })
.expect(201);

const data = registerRes.body?.data ?? registerRes.body;

return {
email,
password,
user: data.user,
tokens: {
accessToken: data.accessToken,
refreshToken: data.refreshToken,
},
};
}

async registerAndLogin(): Promise<AuthResult> {
const email = e2e_${Date.now()}@test.com;
const password = 'Test123!';

await this.http()
.post('/api/v1/auth/register')
.send({ email, password, firstName: 'E2E', lastName: 'User' })
.expect(201);

const loginRes = await this.http()
.post('/api/v1/auth/login')
.send({ email, password })
.expect(200);

const login = loginRes.body?.data ?? loginRes.body;

return {
accessToken: login.accessToken,
refreshToken: login.refreshToken,
user: login.user,
};
}

// ---- ACCOUNTS ----
async createAccount(accessToken: string, payload: any) {
const res = await this.http()
.post('/api/v1/accounts')
.set('Authorization', Bearer ${accessToken})
.send(payload)
.expect(201);

return res.body;
}

// ---- TRANSACTIONS ----
async createTransaction(accessToken: string, payload: any) {
const res = await this.http()
.post('/api/v1/transactions')
.set('Authorization', Bearer ${accessToken})
.send(payload)
.expect(201);

return res.body?.data ?? res.body;
}

// ---- RAW HELPERS (for ownership tests, no auto-expect) ----
async getAccountRaw(accessToken: string, accountId: string) {
return this.http()
.get(/api/v1/accounts/${accountId})
.set('Authorization', Bearer ${accessToken});
}

async getTransactionRaw(accessToken: string, transactionId: string) {
return this.http()
.get(/api/v1/transactions/${transactionId})
.set('Authorization', Bearer ${accessToken});
}

// ---- BUDGETS ----
async createBudget(accessToken: string, payload: any) {
const res = await this.http()
.post('/api/v1/budgets')
.set('Authorization', Bearer ${accessToken})
.send(payload)
.expect(201);

return res.body.data;
}

async getBudgetProgress(accessToken: string, budgetId: string) {
const res = await this.http()
.get(/api/v1/budgets/${budgetId}/progress)
.set('Authorization', Bearer ${accessToken})
.expect(200);

return res.body.data;
}

// ---- ANALYTICS ----
async getAnalyticsOverview(accessToken: string, period: string = 'MONTH') {
const res = await this.http()
.get(/api/v1/analytics/overview?period=${period})
.set('Authorization', Bearer ${accessToken})
.expect(200);

return res.body.data;
}
}

**Patrón Arquitectural:**
- `registerAndLogin()` → Para tests que solo necesitan un usuario autenticado
- `registerUser()` → Para tests de auth con control de datos (duplicate email, weak password)
- `*Raw()` methods → Para ownership tests (no auto-expect status)

**Lección:**
> Test helpers como clase > funciones sueltas. Permite compartir `app` instance sin globals.

---

### Test Suite 1: Auth Flow (11 tests) ⭐⭐⭐

**Archivo: `test/auth.e2e-spec.ts`**

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TestHelpers } from './helpers/test-helpers';

describe('Auth (e2e)', () => {
let app: INestApplication;
let helpers: TestHelpers;

beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();

app = moduleFixture.createNestApplication();

// ✅ CRÍTICO: Aplicar mismo ValidationPipe que en main.ts
app.useGlobalPipes(
new ValidationPipe({
whitelist: true,
forbidNonWhitelisted: true,
transform: true,
}),
);

await app.init();
helpers = new TestHelpers(app);
});

afterAll(async () => {
await app.close();
});

describe('POST /auth/register', () => {
it('should register new user with valid data', async () => {
const result = await helpers.registerUser({
email: 'newuser@example.com',
password: 'Test123!',
firstName: 'John',
lastName: 'Doe',
});

expect(result.user).toBeDefined();
expect(result.user.email).toBe('newuser@example.com');
expect(result.tokens.accessToken).toBeDefined();
expect(result.tokens.refreshToken).toBeDefined();
});

it('should reject duplicate email', async () => {
const email = 'duplicate@example.com';

// Primer registro OK
await helpers.registerUser({ email, password: 'Test123!' });

// Segundo registro debe fallar
const res = await helpers.http()
.post('/api/v1/auth/register')
.send({ email, password: 'Test123!', firstName: 'A', lastName: 'B' })
.expect(409); // Conflict

expect(res.body.message).toContain('ya existe');
});

it('should reject weak password', async () => {
const res = await helpers.http()
.post('/api/v1/auth/register')
.send({
email: 'test@example.com',
password: '123', // ❌ Muy corta, sin uppercase, sin special char
firstName: 'Test',
lastName: 'User',
})
.expect(400);

expect(res.body.message).toBeDefined();
});

it('should reject invalid email format', async () => {
const res = await helpers.http()
.post('/api/v1/auth/register')
.send({
email: 'not-an-email', // ❌ Sin @
password: 'Test123!',
firstName: 'Test',
lastName: 'User',
})
.expect(400);

expect(res.body.message).toBeDefined();
});
});

describe('POST /auth/login', () => {
it('should login with correct credentials', async () => {
const { email, password } = await helpers.registerUser();

const res = await helpers.http()
.post('/api/v1/auth/login')
.send({ email, password })
.expect(200);

const data = res.body.data;
expect(data.accessToken).toBeDefined();
expect(data.refreshToken).toBeDefined();
expect(data.user.email).toBe(email);
});

it('should reject incorrect password', async () => {
const { email } = await helpers.registerUser({ password: 'Correct123!' });

const res = await helpers.http()
.post('/api/v1/auth/login')
.send({ email, password: 'Wrong123!' })
.expect(401);

expect(res.body.message).toContain('Credenciales inválidas');
});

it('should reject non-existent email', async () => {
const res = await helpers.http()
.post('/api/v1/auth/login')
.send({ email: 'nonexistent@example.com', password: 'Test123!' })
.expect(401);

expect(res.body.message).toContain('Credenciales inválidas');
});
});

describe('POST /auth/refresh', () => {
it('should refresh tokens with valid refreshToken (rotation + invalidation)', async () => {
const { tokens } = await helpers.registerUser();
const oldRefreshToken = tokens.refreshToken;

// Step 1: Refresh con old token (debe funcionar)
const res1 = await helpers.http()
.post('/api/v1/auth/refresh')
.send({ refreshToken: oldRefreshToken })
.expect(200);

const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res1.body.data;
expect(newAccessToken).toBeDefined();
expect(newRefreshToken).toBeDefined();
expect(newRefreshToken).not.toBe(oldRefreshToken); // ✅ Token rotation

// Step 2: Intentar refresh con old token de nuevo (debe fallar)
const res2 = await helpers.http()
.post('/api/v1/auth/refresh')
.send({ refreshToken: oldRefreshToken })
.expect(401); // ✅ Token invalidation

expect(res2.body.message).toContain('Refresh token inválido');
});

it('should reject invalid refreshToken', async () => {
const res = await helpers.http()
.post('/api/v1/auth/refresh')
.send({ refreshToken: 'invalid-token-12345' })
.expect(401);

expect(res.body.message).toBeDefined();
});
});

describe('POST /auth/logout', () => {
it('should logout with valid accessToken', async () => {
const { tokens } = await helpers.registerUser();

await helpers.http()
.post('/api/v1/auth/logout')
.set('Authorization', `Bearer ${tokens.accessToken}`)
.expect(200);

// Intentar usar el token después de logout (debe fallar)
await helpers.http()
.get('/api/v1/users/me')
.set('Authorization', `Bearer ${tokens.accessToken}`)
.expect(401);
});

it('should reject logout without token', async () => {
await helpers.http()
.post('/api/v1/auth/logout')
.expect(401);
});
});
});

**Cobertura de Edge Cases:**
- ✅ Duplicate email (409 Conflict)
- ✅ Weak password validation
- ✅ Invalid email format
- ✅ Incorrect credentials (401)
- ✅ Token rotation en refresh
- ✅ Token invalidation después de logout

---

### Test Suite 2: Balance Integrity (1 test) ⭐⭐⭐⭐⭐ CRÍTICO

**Archivo: `test/transactions-balance.e2e-spec.ts`**

describe('Transactions Balance Integrity (e2e)', () => {
let app: INestApplication;
let helpers: TestHelpers;

beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();

app = moduleFixture.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.init();
helpers = new TestHelpers(app);
});

afterAll(async () => {
await app.close();
});

const money = (v: any) => parseFloat(v.toString());

it('should keep account.balance === SUM(INCOME) - SUM(EXPENSE)', async () => {
// Setup: Usuario + Cuenta
const { tokens } = await helpers.registerUser();
const accountPayload = {
name: 'Test Checking',
type: 'CHECKING',
currency: 'EUR',
balance: 0,
};
const account = await helpers.createAccount(tokens.accessToken, accountPayload);
const accountId = account.data.id;

// Validación inicial: balance = 0
let acc = await helpers.getAccount(tokens.accessToken, accountId);
expect(money(acc.data.balance)).toBe(0);

// Transaction 1: INCOME +500
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'INCOME',
amount: 500,
description: 'Salary',
date: new Date().toISOString(),
});

acc = await helpers.getAccount(tokens.accessToken, accountId);
expect(money(acc.data.balance)).toBe(500); // ✅

// Transaction 2: EXPENSE -200
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 200,
description: 'Groceries',
date: new Date().toISOString(),
});

acc = await helpers.getAccount(tokens.accessToken, accountId);
expect(money(acc.data.balance)).toBe(300); // ✅ 500 - 200 = 300

// Transaction 3: INCOME +150
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'INCOME',
amount: 150,
description: 'Freelance',
date: new Date().toISOString(),
});

acc = await helpers.getAccount(tokens.accessToken, accountId);
expect(money(acc.data.balance)).toBe(450); // ✅ 300 + 150 = 450

// Transaction 4: EXPENSE -100
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 100,
description: 'Restaurant',
date: new Date().toISOString(),
});

acc = await helpers.getAccount(tokens.accessToken, accountId);
expect(money(acc.data.balance)).toBe(350); // ✅ 450 - 100 = 350
});
});

**Por Qué Este Test es CRÍTICO:**
- **Atomicity:** Si falla el update de balance, transaction debe rollback
- **Consistency:** Balance debe SIEMPRE = SUM(INCOME) - SUM(EXPENSE)
- **Production Risk:** Balance incorrecto = pérdida de confianza de users

**Prisma Transaction Isolation Level:**
// src/modules/transactions/transactions.service.ts
await this.prisma.$transaction(
async (tx) => {
const transaction = await tx.transaction.create({ data });
await tx.account.update({
where: { id: accountId },
data: {
balance: {
[type === 'INCOME' ? 'increment' : 'decrement']: amount,
},
},
});
return transaction;
},
{
isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // ✅ Máximo nivel
},
);

**Lección:**
> Test de integridad financiera es non-negotiable. Si este test falla, la app NO debe deployarse.

---

### Test Suite 3: Ownership Validation (2 tests) ⭐⭐⭐⭐⭐ CRÍTICO

**Archivo: `test/ownership.e2e-spec.ts`**

describe('Ownership Validation (e2e)', () => {
let app: INestApplication;
let helpers: TestHelpers;

beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();

app = moduleFixture.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.init();
helpers = new TestHelpers(app);
});

afterAll(async () => {
await app.close();
});

it('should prevent User B from accessing User A resources', async () => {
// User A crea recursos
const userA = await helpers.registerAndLogin();
const accountA = await helpers.createAccount(userA.accessToken, {
name: 'Account A',
type: 'CHECKING',
currency: 'EUR',
balance: 1000,
});
const accountAId = accountA.data.id;

const txA = await helpers.createTransaction(userA.accessToken, {
accountId: accountAId,
type: 'EXPENSE',
amount: 50,
description: 'User A transaction',
date: new Date().toISOString(),
});
const txAId = txA.id;

// User B intenta acceder a recursos de User A
const userB = await helpers.registerAndLogin();

// Intentar GET account de User A → 403/404
const resAccount = await helpers.getAccountRaw(userB.accessToken, accountAId);
expect().toContain(resAccount.status);

// Intentar GET transaction de User A → 403/404
const resTx = await helpers.getTransactionRaw(userB.accessToken, txAId);
expect().toContain(resTx.status);

// Intentar UPDATE account de User A → 403/404
const resUpdate = await helpers.updateAccountRaw(
userB.accessToken,
accountAId,
{ name: 'Hacked!' },
);
expect().toContain(resUpdate.status);

// Intentar DELETE transaction de User A → 403/404
const resDelete = await helpers.deleteTransactionRaw(userB.accessToken, txAId);
expect().toContain(resDelete.status);
});

it('should allow users to access only their own resources', async () => {
const user = await helpers.registerAndLogin();

// User crea sus propios recursos
const account = await helpers.createAccount(user.accessToken, {
name: 'My Account',
type: 'SAVINGS',
currency: 'EUR',
balance: 5000,
});
const accountId = account.data.id;

const tx = await helpers.createTransaction(user.accessToken, {
accountId,
type: 'INCOME',
amount: 100,
description: 'My transaction',
date: new Date().toISOString(),
});
const txId = tx.id;

// User debe poder acceder a sus propios recursos
await helpers.http()
.get(`/api/v1/accounts/${accountId}`)
.set('Authorization', `Bearer ${user.accessToken}`)
.expect(200);

await helpers.http()
.get(`/api/v1/transactions/${txId}`)
.set('Authorization', `Bearer ${user.accessToken}`)
.expect(200);

// User debe poder modificar sus propios recursos
await helpers.http()
.patch(`/api/v1/accounts/${accountId}`)
.set('Authorization', `Bearer ${user.accessToken}`)
.send({ name: 'Updated Name' })
.expect(200);
});
});

**Implementación de Ownership en Service Layer:**

// src/modules/accounts/accounts.service.ts
async findOne(id: string, userId: string) {
const account = await this.prisma.account.findUnique({
where: { id },
});

if (!account) {
throw new NotFoundException('Cuenta no encontrada');
}

// ✅ CRITICAL: Validar ownership
if (account.userId !== userId) {
throw new ForbiddenException('No tienes permiso para acceder a esta cuenta');
}

return account;
}

**Por Qué Este Test es CRÍTICO:**
- **Security Risk:** Sin ownership validation, User B ve datos de User A
- **Privacy:** Financial data es extremadamente sensible
- **GDPR Compliance:** Users deben controlar sus propios datos

**Lección:**
> Ownership validation debe estar en TODOS los endpoints que acceden a recursos de users. No hay excepciones.

---

### Test Suite 4: Budget Progress (3 tests) ⭐⭐⭐

**Archivo: `test/budget-progress.e2e-spec.ts`**

describe('Budget Progress (e2e)', () => {
let app: INestApplication;
let helpers: TestHelpers;

beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();

app = moduleFixture.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.init();
helpers = new TestHelpers(app);
});

afterAll(async () => {
await app.close();
});

it('should trigger shouldAlert when spending reaches 80% threshold', async () => {
const { tokens } = await helpers.registerUser();

// Create account + category
const account = await helpers.createAccount(tokens.accessToken, {
name: 'Budget Test',
type: 'CHECKING',
currency: 'EUR',
balance: 1000,
});
const accountId = account.data.id;

const category = await helpers.createCategory(tokens.accessToken, {
name: 'Food',
type: 'EXPENSE',
});
const categoryId = category.id;

// Create budget: €400 limit, 80% alert
const budget = await helpers.createBudget(tokens.accessToken, {
name: 'Food Budget',
amount: 400,
categoryId,
period: 'MONTHLY',
alertThreshold: 80,
});
const budgetId = budget.id;

// Transaction 1: €200 (50% del budget)
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 200,
categoryId,
description: 'Groceries',
date: new Date().toISOString(),
});

let progress = await helpers.getBudgetProgress(tokens.accessToken, budgetId);
expect(progress.shouldAlert).toBe(false); // ✅ 50% < 80%

// Transaction 2: €120 más (total €320 = 80%)
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 120,
categoryId,
description: 'Restaurant',
date: new Date().toISOString(),
});

progress = await helpers.getBudgetProgress(tokens.accessToken, budgetId);
expect(progress.shouldAlert).toBe(true); // ✅ 80% >= 80%
expect(progress.isOverBudget).toBe(false); // ✅ 320 < 400
});

it('should trigger isOverBudget when spending exceeds 100%', async () => {
const { tokens } = await helpers.registerUser();

const account = await helpers.createAccount(tokens.accessToken, {
name: 'Over Budget Test',
type: 'CHECKING',
currency: 'EUR',
balance: 2000,
});
const accountId = account.data.id;

const category = await helpers.createCategory(tokens.accessToken, {
name: 'Entertainment',
type: 'EXPENSE',
});
const categoryId = category.id;

const budget = await helpers.createBudget(tokens.accessToken, {
name: 'Entertainment Budget',
amount: 200,
categoryId,
period: 'MONTHLY',
alertThreshold: 80,
});
const budgetId = budget.id;

// Transaction: €250 (125% del budget)
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 250,
categoryId,
description: 'Concert tickets',
date: new Date().toISOString(),
});

const progress = await helpers.getBudgetProgress(tokens.accessToken, budgetId);
expect(progress.isOverBudget).toBe(true); // ✅ 250 > 200
expect(progress.shouldAlert).toBe(true); // ✅ También debe alertar
expect(progress.percentageUsed).toBeGreaterThan(100);
});

it('should calculate progress accurately with multiple transactions', async () => {
const { tokens } = await helpers.registerUser();

const account = await helpers.createAccount(tokens.accessToken, {
name: 'Multi Transaction Test',
type: 'CHECKING',
currency: 'EUR',
balance: 5000,
});
const accountId = account.data.id;

const category = await helpers.createCategory(tokens.accessToken, {
name: 'Transport',
type: 'EXPENSE',
});
const categoryId = category.id;

const budget = await helpers.createBudget(tokens.accessToken, {
name: 'Transport Budget',
amount: 300,
categoryId,
period: 'MONTHLY',
alertThreshold: 75,
});
const budgetId = budget.id;

// Multiple small transactions
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 50,
categoryId,
description: 'Gas',
date: new Date().toISOString(),
});

await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 75,
categoryId,
description: 'Metro card',
date: new Date().toISOString(),
});

await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 100,
categoryId,
description: 'Uber',
date: new Date().toISOString(),
});

const progress = await helpers.getBudgetProgress(tokens.accessToken, budgetId);

// Total: 50 + 75 + 100 = 225
expect(progress.spent).toBe(225);
expect(progress.percentageUsed).toBe(75); // 225/300 = 75%
expect(progress.shouldAlert).toBe(true); // 75% >= 75%
expect(progress.isOverBudget).toBe(false); // 225 < 300
});
});

**Budget Progress Calculation (Service Layer):**

// src/modules/budgets/budgets.service.ts
async getProgress(budgetId: string, userId: string) {
const budget = await this.findOne(budgetId, userId);

const result = await this.prisma.transaction.aggregate({
where: {
categoryId: budget.categoryId,
type: 'EXPENSE',
date: {
gte: budget.startDate,
lte: budget.endDate,
},
},
_sum: { amount: true },
_count: true,
});

const spent = result._sum.amount?.toNumber() || 0;
const percentageUsed = (spent / budget.amount.toNumber()) * 100;
const remaining = budget.amount.toNumber() - spent;
const shouldAlert = percentageUsed >= budget.alertThreshold;
const isOverBudget = spent > budget.amount.toNumber();

return {
budgetId: budget.id,
budgetName: budget.name,
limit: budget.amount,
spent,
remaining,
percentageUsed: parseFloat(percentageUsed.toFixed(2)),
shouldAlert,
isOverBudget,
transactionCount: result._count,
};
}

---

### Test Suite 5: Analytics Accuracy (4 tests) ⭐⭐⭐⭐

**Archivo: `test/analytics-accuracy.e2e-spec.ts`**

describe('Analytics Accuracy (e2e)', () => {
let app: INestApplication;
let helpers: TestHelpers;

beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();

app = moduleFixture.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.init();
helpers = new TestHelpers(app);
});

afterAll(async () => {
await app.close();
});

it('should calculate totalIncome, totalExpenses, netSavings, and savingsRate accurately', async () => {
const { tokens } = await helpers.registerUser();

const account = await helpers.createAccount(tokens.accessToken, {
name: 'Analytics Test',
type: 'CHECKING',
currency: 'EUR',
balance: 0,
});
const accountId = account.data.id;

// INCOME: €2000
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'INCOME',
amount: 2000,
description: 'Salary',
date: new Date().toISOString(),
});

// EXPENSES: €500 + €300 = €800
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 500,
description: 'Rent',
date: new Date().toISOString(),
});

await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 300,
description: 'Groceries',
date: new Date().toISOString(),
});

const analytics = await helpers.getAnalyticsOverview(tokens.accessToken, 'MONTH');

expect(analytics.totalIncome).toBe(2000);
expect(analytics.totalExpenses).toBe(800);
expect(analytics.netSavings).toBe(1200); // 2000 - 800
expect(analytics.savingsRate).toBe(60); // (1200/2000) * 100
});

it('should handle zero income correctly (savingsRate = 0)', async () => {
const { tokens } = await helpers.registerUser();

const account = await helpers.createAccount(tokens.accessToken, {
name: 'Zero Income Test',
type: 'CHECKING',
currency: 'EUR',
balance: 1000,
});
const accountId = account.data.id;

// Solo EXPENSE, sin INCOME
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 100,
description: 'Shopping',
date: new Date().toISOString(),
});

const analytics = await helpers.getAnalyticsOverview(tokens.accessToken, 'MONTH');

expect(analytics.totalIncome).toBe(0);
expect(analytics.totalExpenses).toBe(100);
expect(analytics.netSavings).toBe(-100);
expect(analytics.savingsRate).toBe(0); // ✅ No NaN o Infinity
});

it('should calculate avgDailyExpense correctly', async () => {
const { tokens } = await helpers.registerUser();

const account = await helpers.createAccount(tokens.accessToken, {
name: 'Avg Expense Test',
type: 'CHECKING',
currency: 'EUR',
balance: 5000,
});
const accountId = account.data.id;

// 3 transactions = €900 total
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 300,
description: 'Day 1',
date: new Date().toISOString(),
});

await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 400,
description: 'Day 2',
date: new Date().toISOString(),
});

await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 200,
description: 'Day 3',
date: new Date().toISOString(),
});

const analytics = await helpers.getAnalyticsOverview(tokens.accessToken, 'MONTH');

// avgDailyExpense = totalExpenses / days in period
expect(analytics.avgDailyExpense).toBeGreaterThan(0);
expect(analytics.totalExpenses).toBe(900);
});

it('should validate topCategories ranking by amount', async () => {
const { tokens } = await helpers.registerUser();

const account = await helpers.createAccount(tokens.accessToken, {
name: 'Top Categories Test',
type: 'CHECKING',
currency: 'EUR',
balance: 10000,
});
const accountId = account.data.id;

// Category 1: Food - €500
const catFood = await helpers.createCategory(tokens.accessToken, {
name: 'Food',
type: 'EXPENSE',
});

// Category 2: Transport - €300
const catTransport = await helpers.createCategory(tokens.accessToken, {
name: 'Transport',
type: 'EXPENSE',
});

// Category 3: Entertainment - €800
const catEntertainment = await helpers.createCategory(tokens.accessToken, {
name: 'Entertainment',
type: 'EXPENSE',
});

// Transactions
await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 500,
categoryId: catFood.id,
description: 'Groceries',
date: new Date().toISOString(),
});

await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 300,
categoryId: catTransport.id,
description: 'Gas',
date: new Date().toISOString(),
});

await helpers.createTransaction(tokens.accessToken, {
accountId,
type: 'EXPENSE',
amount: 800,
categoryId: catEntertainment.id,
description: 'Concert',
date: new Date().toISOString(),
});

const analytics = await helpers.getAnalyticsOverview(tokens.accessToken, 'MONTH');

// topCategories debe estar ordenado por amount DESC
expect(analytics.topCategories).toHaveLength(3);
expect(analytics.topCategories.categoryName).toBe('Entertainment'); // €800
expect(analytics.topCategories.categoryName).toBe('Food'); // €500[1]
expect(analytics.topCategories.categoryName).toBe('Transport'); // €300[2]
});
});

**Analytics Overview Calculation (Service Layer):**

// src/modules/analytics/analytics.service.ts
async getOverview(userId: string, period: AnalyticsPeriod) {
const { startDate, endDate } = this.calculateDateRange(period);

// Parallel aggregations para performance
const [incomeResult, expenseResult, byCategory] = await Promise.all([
// Total INCOME
this.prisma.transaction.aggregate({
where: {
userId,
type: 'INCOME',
date: { gte: startDate, lte: endDate },
},
_sum: { amount: true },
}),

// Total EXPENSE
this.prisma.transaction.aggregate({
where: {
userId,
type: 'EXPENSE',
date: { gte: startDate, lte: endDate },
},
_sum: { amount: true },
_avg: { amount: true },
}),

// Breakdown por categoría
this.prisma.transaction.groupBy({
by: ['categoryId'],
where: {
userId,
type: 'EXPENSE',
date: { gte: startDate, lte: endDate },
},
_sum: { amount: true },
_count: true,
}),
]);

const totalIncome = incomeResult._sum.amount?.toNumber() || 0;
const totalExpenses = expenseResult._sum.amount?.toNumber() || 0;
const netSavings = totalIncome - totalExpenses;

// ✅ CRITICAL: Prevenir división por cero
const savingsRate = totalIncome === 0
? 0
: parseFloat(((netSavings / totalIncome) * 100).toFixed(2));

const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
const avgDailyExpense = parseFloat((totalExpenses / days).toFixed(2));

// Top categories ordenadas por amount
const topCategories = byCategory
.sort((a, b) => b._sum.amount - a._sum.amount)
.slice(0, 5)
.map(cat => ({
categoryId: cat.categoryId,
categoryName: '...', // Fetch category name
spent: cat._sum.amount,
transactionCount: cat._count,
}));

return {
totalIncome,
totalExpenses,
netSavings,
savingsRate,
avgDailyExpense,
topCategories,
};
}

---

## Desafío Técnico: CACHE_MANAGER Dependency Error ⭐⭐⭐⭐

**Tiempo invertido:** 1 hora  
**Dificultad:** Media

**Error Inicial:**
Nest can't resolve dependencies of the CacheInterceptor (Reflector, ?).
Please make sure that the argument "CACHE_MANAGER" at index is​
available in the AnalyticsModule context.

**Causa Raíz:**
// analytics.controller.ts
@Controller('analytics')
@UseInterceptors(CacheInterceptor) // ❌ Requiere CACHE_MANAGER
export class AnalyticsController { ... }

// analytics.module.ts
@Module({
imports: [PrismaModule], // ❌ Falta CacheModule
controllers: [AnalyticsController],
providers: [AnalyticsService],
})
export class AnalyticsModule {}

**Solución:**
// analytics.module.ts
import { CacheModule } from '../../infrastructure/cache/cache.module';

@Module({
imports: [
PrismaModule,
CacheModule, // ✅ Agregar CacheModule
],
controllers: [AnalyticsController],
providers: [AnalyticsService],
})
export class AnalyticsModule {}

**Lección:**
> Si un controller usa `@UseInterceptors(CacheInterceptor)`, su module debe importar `CacheModule`. NestJS no puede resolver dependencias implícitas.

**Debugging Process:**
1. Leer error message completo (sugiere qué falta)
2. Identificar que `CacheInterceptor` requiere `CACHE_MANAGER`
3. Verificar que el module importe `CacheModule`
4. Aplicar fix y re-test

---

## Railway Deployment Process

**Completado:**
- ✅ Railway project creado
- ✅ PostgreSQL + Redis managed services
- ✅ Environment variables configuradas
- ✅ Build + Deploy automático desde GitHub
- ✅ Health check endpoint working
- ✅ Swagger UI accesible en producción

---

### Configuración de Archivos

**1. `railway.json`**

{
"$schema": "https://railway.app/railway.schema.json",
"build": {
"builder": "NIXPACKS",
"buildCommand": "npm install && npm run build && npx prisma generate"
},
"deploy": {
"startCommand": "npm run start:prod",
"healthcheckPath": "/api/v1/health",
"healthcheckTimeout": 30,
"restartPolicyType": "ON_FAILURE",
"restartPolicyMaxRetries": 3
}
}

**2. `package.json` Scripts**

{
"scripts": {
"build": "nest build",
"start:prod": "node dist/main",
"prisma:generate": "prisma generate",
"prisma:migrate": "prisma migrate deploy",
"prisma:seed": "ts-node prisma/seed.ts"
},
"engines": {
"node": "20.x",
"npm": "10.x"
}
}

**3. `.railwayignore`**

node_modules/
.git/
.env
.env.local
test/
coverage/
*.log
.DS_Store
README.md

---

### Environment Variables en Railway

**Variables Configuradas:**

Auto-generated by Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

Manual configuration
JWT_SECRET=production-super-secret-key-change-this-in-real-prod
JWT_REFRESH_SECRET=production-refresh-secret-key-change-this
NODE_ENV=production
PORT=3000

**Prisma Connection String Format:**
postgresql://user:password@host:5432/database?schema=public&sslmode=require

---

### Deploy Steps Ejecutados

**Step 1: Railway CLI (opcional)**
npm install -g @railway/cli
railway login
railway link # Connect to existing project

**Step 2: Deploy desde GitHub**
1. Railway Dashboard → New Project → Deploy from GitHub
2. Select repository: `ayanraimov/financeflow`
3. Select branch: `main`
4. Railway auto-detects NestJS y aplica `railway.json` config

**Step 3: Add Database Services**
1. Add PostgreSQL → Railway genera `DATABASE_URL`
2. Add Redis → Railway genera `REDIS_URL`
3. Variables automáticamente inyectadas en app

**Step 4: Configure Custom Variables**
railway variables set JWT_SECRET="your-secret"
railway variables set JWT_REFRESH_SECRET="your-refresh-secret"
railway variables set NODE_ENV="production"

**Step 5: Run Migrations**
railway run npx prisma migrate deploy

**Step 6: (Opcional) Seed Database**
railway run npm run prisma:seed

---

### Health Check Endpoint

**Archivo: `src/app.controller.ts`**

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './core/decorators/public.decorator';
import { PrismaService } from './infrastructure/database/prisma.service';
import { RedisService } from './infrastructure/cache/redis.service';

@ApiTags('Health')
@Controller()
export class AppController {
constructor(
private readonly prisma: PrismaService,
private readonly redis: RedisService,
) {}

@Get('health')
@Public()
@ApiOperation({ summary: 'Health check endpoint' })
async health() {
try {
// Test database connection
await this.prisma.$queryRawSELECT 1;
const dbStatus = 'connected';

// Test Redis connection (opcional)
let redisStatus = 'not_configured';
try {
await this.redis.ping();
redisStatus = 'connected';
} catch {
redisStatus = 'disconnected';
}

return {
status: 'healthy',
timestamp: new Date().toISOString(),
uptime: process.uptime(),
database: dbStatus,
redis: redisStatus,
environment: process.env.NODE_ENV || 'development',
version: '1.0.0',
};
} catch (error) {
return {
status: 'unhealthy',
timestamp: new Date().toISOString(),
error: error.message,
};
}
}
}

**Test en Production:**
curl https://financeflow-api-production.up.railway.app/api/v1/health

Response:
{
"status": "healthy",
"timestamp": "2025-12-14T18:05:55.701Z",
"uptime": 3530.703333253,
"database": "connected",
"redis": "connected",
"environment": "production",
"version": "1.0.0"
}

---

### Deployment Metrics

**Build Time:** ~3 minutos
- npm install: 60s
- nest build: 45s
- prisma generate: 30s
- Deploy: 45s

**Startup Time:** ~10 segundos
- App initialization: 5s
- Database connection: 2s
- Redis connection: 1s
- Health check OK: 2s

**Uptime:** 59 minutos sin crashes (al momento del test)

**Memory Usage:** ~180 MB (RSS)

**Response Times en Production:**
| Endpoint | Time |
|----------|------|
| GET /health | 45ms |
| GET /analytics/overview | 180ms |
| POST /transactions | 150ms |
| GET /transactions?limit=20 | 85ms |

---

## Métricas Finales: Testing Coverage

**Test Results:**
Test Suites: 6 passed, 6 total
Tests: 22 passed, 22 total
Snapshots: 0 total
Time: 11.47 s

**Coverage por Feature:**

| Feature | Tests | Status |
|---------|-------|--------|
| **Auth Flow** | 11 | ✅ 100% |
| **Balance Integrity** | 1 | ✅ 100% (CRÍTICO) |
| **Ownership Validation** | 2 | ✅ 100% (CRÍTICO) |
| **Budget Progress** | 3 | ✅ 100% |
| **Analytics Accuracy** | 4 | ✅ 100% |
| **App Health** | 1 | ✅ 100% |

**Critical Paths Covered:**
- ✅ Register → Login → Refresh → Logout (token rotation)
- ✅ Transaction → Balance update (atomic operation)
- ✅ User A resources → User B access denied (403/404)
- ✅ Budget 80% → shouldAlert = true
- ✅ Budget 100% → isOverBudget = true
- ✅ Analytics aggregations (no division by zero)

---

## Decisiones de Arquitectura: Testing

### 1. E2E Over Unit Tests (para MVP)

**Razón:**
- E2E tests validan flujos completos (real user behavior)
- Unit tests aíslan lógica pero no validan integración
- MVP prioriza confidence en critical paths

**Trade-off:**
- E2E tests más lentos (11.47s vs ~2s unit tests)
- Pero mejor cobertura de bugs reales

**Balance Final:**
- 22 E2E tests (critical paths)
- 0 unit tests (puede agregarse después)

---

### 2. Test Database Cleanup en `beforeEach`

**Razón:**
- Garantiza que cada test empieza con DB limpia
- Previene test interdependencies
- Detecta bugs en migrations/seeds

**Alternativa descartada:**
- Cleanup en `afterEach` → si test falla, siguiente test también falla
- Mock database → no valida Prisma queries reales

**Lección:**
> Test isolation > speed. Tests deben ser independientes aunque sean más lentos.

---

### 3. TestHelpers como Clase (no funciones sueltas)

**Razón:**
- Encapsula `app` instance (no globals)
- Permite compartir lógica entre test suites
- Fácil de extender (herencia)

**Ejemplo de Extensión Futura:**
class AdvancedTestHelpers extends TestHelpers {
async seedFullScenario() {
// Create user + account + categories + transactions + budgets
}
}

---

## Desafíos Técnicos: Deployment

### 1. Prisma Generate en Build ⭐⭐⭐

**Problema inicial:**
Build command sin prisma generate
npm run build

Error en runtime:
Error: @prisma/client did not initialize yet.
You probably need to run prisma generate

**Solución:**
// railway.json
{
"build": {
"buildCommand": "npm install && npm run build && npx prisma generate"
}
}

**Lección:**
> Prisma generate debe ejecutarse DESPUÉS de npm install pero ANTES de start. Railway no lo hace automáticamente.

---

### 2. Environment Variables Precedence ⭐⭐⭐⭐

**Problema inicial:**
// .env.production
DATABASE_URL="postgresql://localhost:5432/financeflow"

// Railway inyecta:
DATABASE_URL="postgresql://prod-host.railway.app:5432/railway"

// ¿Cuál usa la app?

**Solución:**
Railway variables tienen precedencia sobre `.env` files. Eliminar `.env.production` del repo.

.railwayignore
.env
.env.*

**Lección:**
> Nunca commitear `.env` files con production secrets. Usar Railway variables UI.

---

### 3. Health Check Timeout ⭐⭐⭐

**Problema inicial:**
Railway marcaba app como "unhealthy" después de deploy.

**Causa:**
// railway.json (config inicial)
{
"deploy": {
"healthcheckTimeout": 10 // ❌ Muy corto
}
}

App tardaba 12s en inicializar → health check fallaba.

**Solución:**
{
"deploy": {
"healthcheckTimeout": 30, // ✅ Suficiente para init
"healthcheckPath": "/api/v1/health"
}
}

**Lección:**
> Health check timeout debe ser > app startup time. Mejor 30s que 10s.

---

## Reflexión del Acto 4

El Acto 4 fue el **más gratificante** porque:

1. **Tests dan confidence:** Ver 22 tests passing después de deploy = tranquilidad
2. **Railway simplifica deployment:** PostgreSQL + Redis managed = menos headaches
3. **Production-ready significa testable:** Sin tests, no hay manera de garantizar calidad

**Tiempo total Acto 4:** 8 horas  
**Breakdown:**
- E2E testing setup: 2 horas
- Test suites (5 critical): 4 horas
- Railway deployment: 1.5 horas
- Debugging (CACHE_MANAGER, health check): 0.5 horas

---

### Lo Que Aprendí en el Acto 4

**Técnico:**
1. **E2E testing structure:** Setup → Helpers → Test suites → Assertions
2. **Test isolation matters:** Database cleanup + beforeEach
3. **Railway deployment flow:** Build → Migrate → Health check
4. **Prisma in testing:** Connection pooling, transaction isolation
5. **Supertest patterns:** `.expect()` chaining, raw requests

**Arquitectural:**
1. **Critical paths first:** Auth, balance integrity, ownership
2. **Test helpers = DRY tests:** Reutilizar lógica común
3. **Health checks are not optional:** Production monitoring depende de esto
4. **Environment variables precedence:** Railway > .env files

**Soft Skills:**
1. **Debugging systematically:** Error message → Root cause → Fix → Verify
2. **Documentation discipline:** Este DEVELOPMENT.md es invaluable
3. **Trade-off analysis:** E2E speed vs coverage, health check timeout
4. **Production mindset:** Test como user real, no como developer

---

### Skills Desarrolladas

**Testing:**
- ✅ Jest E2E configuration
- ✅ Supertest API testing
- ✅ Test database management
- ✅ Test isolation strategies
- ✅ Assertion patterns
- ✅ Test helpers design

**DevOps:**
- ✅ Railway deployment (PaaS)
- ✅ Managed databases (PostgreSQL + Redis)
- ✅ Environment variables management
- ✅ Health check endpoints
- ✅ Build pipelines
- ✅ Production monitoring basics

**NestJS:**
- ✅ Testing modules compilation
- ✅ Validation pipes en testing
- ✅ Guards en E2E tests
- ✅ Module dependency resolution

---

## Comparación: Local vs Production

| Aspecto | Local (dev) | Production (Railway) |
|---------|-------------|----------------------|
| **Database** | Docker PostgreSQL | Railway PostgreSQL (managed) |
| **Redis** | Docker Redis | Railway Redis (managed) |
| **Environment** | .env file | Railway variables |
| **SSL** | No | Yes (automatic) |
| **Monitoring** | Manual | Railway dashboard |
| **Backups** | None | Railway automatic backups |
| **Logs** | Console | Railway logs UI |
| **Domain** | localhost:3000 | financeflow-api-production.up.railway.app |

---

## Lessons Learned: Production Checklist

Antes de deployar a production, verificar:

- ✅ Health check endpoint implementado
- ✅ Database migrations probadas en staging
- ✅ Environment variables sin secrets hardcodeados
- ✅ Tests críticos passing (balance, ownership, auth)
- ✅ Error handling robusto (no crashes en edge cases)
- ✅ Rate limiting configurado (anti-abuse)
- ✅ CORS configurado (solo dominios permitidos)
- ✅ Logging estructurado (para debugging en prod)
- ✅ Monitoring básico (health checks)
- ✅ Backup strategy (Railway auto-backups)

---

## Roadmap Post-Acto 4

**Improvements para v1.1:**

### Testing
- [ ] Aumentar coverage a 80%+ (agregar unit tests)
- [ ] Load testing (Artillery/k6)
- [ ] Security testing (OWASP ZAP)
- [ ] Performance benchmarks

### DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging environment
- [ ] Automated rollbacks
- [ ] Better monitoring (Sentry, DataDog)

### Features
- [ ] WebSocket para budget alerts
- [ ] Recurring transactions
- [ ] Multi-currency support
- [ ] Export CSV/PDF reports
- [ ] AI spending insights

---

**Última actualización:** 14 diciembre 2025, 19:40 CET  
**Status Acto 4:** ✅ Completado - Production Ready  
**Deployment URL:** https://financeflow-api-production.up.railway.app  
**Test Coverage:** 22 E2E tests passing (11.47s)  
**Uptime:** 1+ hora sin crashes

---

**Siguiente:** Acto 5 (TBD - Posibles features: WebSockets, AI insights, Mobile app)