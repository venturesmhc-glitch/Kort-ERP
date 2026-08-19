-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ScheduledNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateIndex
CREATE INDEX "appointments_clientId_idx" ON "appointments"("clientId");

-- CreateIndex
CREATE INDEX "appointments_tipoCorteId_idx" ON "appointments"("tipoCorteId");

-- CreateIndex
CREATE INDEX "appointments_discountId_idx" ON "appointments"("discountId");

-- CreateIndex
CREATE INDEX "cuts_clientId_idx" ON "cuts"("clientId");

-- CreateIndex
CREATE INDEX "cuts_barberoId_idx" ON "cuts"("barberoId");

-- CreateIndex
CREATE INDEX "cuts_tipoCorteId_idx" ON "cuts"("tipoCorteId");

-- CreateIndex
CREATE INDEX "cuts_discountId_idx" ON "cuts"("discountId");

-- CreateIndex
CREATE INDEX "sales_clientId_idx" ON "sales"("clientId");

-- CreateIndex
CREATE INDEX "sales_sellerId_idx" ON "sales"("sellerId");

-- CreateIndex
CREATE INDEX "sales_discountId_idx" ON "sales"("discountId");

-- CreateIndex
CREATE INDEX "sale_items_articleId_idx" ON "sale_items"("articleId");

-- CreateIndex
CREATE INDEX "stock_movements_articleId_idx" ON "stock_movements"("articleId");

-- CreateIndex
CREATE INDEX "treasury_entries_categoryId_idx" ON "treasury_entries"("categoryId");

-- CreateTable
CREATE TABLE "scheduled_notifications" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_notifications_status_sendAt_idx" ON "scheduled_notifications"("status", "sendAt");

-- AddForeignKey
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
