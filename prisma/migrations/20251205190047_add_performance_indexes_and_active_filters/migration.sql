/*
  Warnings:

  - You are about to drop the column `icon` on the `accounts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "budgets_categoryId_idx";

-- DropIndex
DROP INDEX "categories_type_idx";

-- DropIndex
DROP INDEX "transactions_accountId_idx";

-- DropIndex
DROP INDEX "transactions_categoryId_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "icon",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "accounts_userId_isDefault_idx" ON "accounts"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "accounts_userId_isActive_idx" ON "accounts"("userId", "isActive");

-- CreateIndex
CREATE INDEX "budgets_userId_period_idx" ON "budgets"("userId", "period");

-- CreateIndex
CREATE INDEX "budgets_userId_categoryId_idx" ON "budgets"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "budgets_startDate_endDate_idx" ON "budgets"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "budgets_userId_isActive_idx" ON "budgets"("userId", "isActive");

-- CreateIndex
CREATE INDEX "categories_userId_type_idx" ON "categories"("userId", "type");

-- CreateIndex
CREATE INDEX "categories_type_isDefault_idx" ON "categories"("type", "isDefault");

-- CreateIndex
CREATE INDEX "transactions_userId_date_idx" ON "transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "transactions_userId_type_idx" ON "transactions"("userId", "type");

-- CreateIndex
CREATE INDEX "transactions_userId_accountId_idx" ON "transactions"("userId", "accountId");

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_idx" ON "transactions"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "transactions_accountId_date_idx" ON "transactions"("accountId", "date");

-- CreateIndex
CREATE INDEX "transactions_userId_isRecurring_idx" ON "transactions"("userId", "isRecurring");
