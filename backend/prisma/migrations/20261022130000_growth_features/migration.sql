-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUST');

-- CreateEnum
CREATE TYPE "ClientMessageKind" AS ENUM ('REVIEW_REQUEST', 'REACTIVATION');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commissionRate" INTEGER;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "lastReactivationSentAt" TIMESTAMP(3),
ADD COLUMN     "lastVisitAt" TIMESTAMP(3),
ADD COLUMN     "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "cutId" TEXT,
    "saleId" TEXT,
    "discountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_client_messages" (
    "id" TEXT NOT NULL,
    "kind" "ClientMessageKind" NOT NULL,
    "clientId" TEXT NOT NULL,
    "cutId" TEXT,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_client_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyEarnRatio" INTEGER NOT NULL DEFAULT 100,
    "loyaltyRedeemRatio" INTEGER NOT NULL DEFAULT 10,
    "reactivationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reactivationInactiveDays" INTEGER NOT NULL DEFAULT 45,
    "reactivationCooldownDays" INTEGER NOT NULL DEFAULT 30,
    "reactivationDiscountId" TEXT,
    "reviewRequestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reviewRequestDelayHours" INTEGER NOT NULL DEFAULT 2,
    "googleReviewUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loyalty_transactions_clientId_idx" ON "loyalty_transactions"("clientId");

-- CreateIndex
CREATE INDEX "scheduled_client_messages_status_sendAt_idx" ON "scheduled_client_messages"("status", "sendAt");

-- CreateIndex
CREATE INDEX "scheduled_client_messages_clientId_idx" ON "scheduled_client_messages"("clientId");

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_client_messages" ADD CONSTRAINT "scheduled_client_messages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
