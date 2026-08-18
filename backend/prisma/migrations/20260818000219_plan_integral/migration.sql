-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASICO', 'INTEGRAL');

-- CreateEnum
CREATE TYPE "OrdenCompraEstado" AS ENUM ('BORRADOR', 'CONFIRMADA', 'ENVIADA', 'RECIBIDA');

-- AlterTable
-- Rename en vez de drop+add para preservar los umbrales ya cargados (el
-- stock minimo nuevo es semanticamente el mismo dato que el umbral viejo).
ALTER TABLE "articles" RENAME COLUMN "lowStockThreshold" TO "stockMinimo";
ALTER TABLE "articles" ADD COLUMN     "stockCritico" INTEGER;

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "plan" "Plan" NOT NULL DEFAULT 'BASICO',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "condicionesPago" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor_productos" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "precioCosto" INTEGER NOT NULL,
    "tiempoEntregaDias" INTEGER,
    "esPreferido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedor_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "estado" "OrdenCompraEstado" NOT NULL DEFAULT 'BORRADOR',
    "total" INTEGER NOT NULL DEFAULT 0,
    "fechaConfirmacion" TIMESTAMP(3),
    "fechaEnvio" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra_items" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orden_compra_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_productos_proveedorId_articleId_key" ON "proveedor_productos"("proveedorId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "orden_compra_items_ordenId_articleId_key" ON "orden_compra_items"("ordenId", "articleId");

-- AddForeignKey
ALTER TABLE "proveedor_productos" ADD CONSTRAINT "proveedor_productos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_productos" ADD CONSTRAINT "proveedor_productos_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
