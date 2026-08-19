-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('MERCH', 'CORTES', 'BOTH');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "discountId" TEXT;

-- AlterTable
ALTER TABLE "cuts" ADD COLUMN     "discountAmount" INTEGER,
ADD COLUMN     "discountId" TEXT;

-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "scope" "DiscountScope" NOT NULL DEFAULT 'MERCH';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "discountAmount" INTEGER,
ADD COLUMN     "discountId" TEXT;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuts" ADD CONSTRAINT "cuts_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
