-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'PENDING_PICKUP', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "sales" ADD COLUMN "appointmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_appointmentId_key" ON "sales"("appointmentId");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
