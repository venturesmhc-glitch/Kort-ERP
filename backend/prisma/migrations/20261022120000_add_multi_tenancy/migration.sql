-- Multi-tenancy: la base actual tiene datos de una sola barberia (la
-- instalacion de hoy). Esta migracion:
--   1) crea la tabla "tenants",
--   2) da de alta un tenant "default" con esos datos,
--   3) agrega tenantId NULLABLE a todas las tablas operativas,
--   4) backfillea tenantId = tenant default en cada fila existente,
--   5) recien ahi vuelve tenantId NOT NULL y agrega los indices/constraints
--      finales (incluidos los uniques compuestos por tenant).
-- Pensada para correr tal cual contra produccion via `prisma migrate deploy`
-- sin perder datos: todo el backfill va antes de cualquier NOT NULL/PK.

-- =========================================================================
-- 1) Tabla raiz
-- =========================================================================
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- =========================================================================
-- 2) Tenant default: toma el nombre de la instalacion actual si existe
-- =========================================================================
INSERT INTO "tenants" ("id", "slug", "name", "active", "createdAt", "updatedAt")
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'default',
  COALESCE((SELECT "name" FROM "business_settings" LIMIT 1), 'Mi Barberia'),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- =========================================================================
-- 3) tenantId nullable en todas las tablas operativas
-- =========================================================================
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "clients" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "work_schedules" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "appointment_settings" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "appointments" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "cuts" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "parameter_categories" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "parameter_items" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "articles" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "sales" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "sale_items" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "work_sessions" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "treasury_entries" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "organization_settings" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "proveedores" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "proveedor_productos" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ordenes_compra" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "orden_compra_items" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "business_settings" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "discounts" ADD COLUMN "tenantId" TEXT;

-- =========================================================================
-- 4) Backfill: toda fila existente pasa a pertenecer al tenant default
-- =========================================================================
UPDATE "users" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "clients" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "work_schedules" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "appointment_settings" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "appointments" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "cuts" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "parameter_categories" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "parameter_items" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "articles" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "stock_movements" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "sales" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "sale_items" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "work_sessions" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "treasury_entries" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "organization_settings" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "proveedores" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "proveedor_productos" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "ordenes_compra" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "orden_compra_items" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "business_settings" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';
UPDATE "discounts" SET "tenantId" = 'a0000000-0000-4000-8000-000000000001';

-- =========================================================================
-- 5) Ahora que no hay nulls: NOT NULL en las tablas que no son singleton
--    (los singleton -appointment_settings/organization_settings/
--    business_settings- quedan NOT NULL implicito al pasar a ser su PK, ver
--    paso 6)
-- =========================================================================
ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "work_schedules" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "appointments" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "cuts" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "parameter_categories" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "parameter_items" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "articles" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "sales" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "sale_items" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "work_sessions" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "treasury_entries" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "proveedores" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "proveedor_productos" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ordenes_compra" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "orden_compra_items" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "discounts" ALTER COLUMN "tenantId" SET NOT NULL;

-- =========================================================================
-- 6) Singleton tables (una fila por tenant): la PK pasa de "id" fijo a
--    tenantId
-- =========================================================================
ALTER TABLE "appointment_settings"
  DROP CONSTRAINT "appointment_settings_pkey",
  DROP COLUMN "id",
  ADD CONSTRAINT "appointment_settings_pkey" PRIMARY KEY ("tenantId");

ALTER TABLE "organization_settings"
  DROP CONSTRAINT "organization_settings_pkey",
  DROP COLUMN "id",
  ADD CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("tenantId");

ALTER TABLE "business_settings"
  DROP CONSTRAINT "business_settings_pkey",
  DROP COLUMN "id",
  ADD CONSTRAINT "business_settings_pkey" PRIMARY KEY ("tenantId");

-- =========================================================================
-- 7) Los uniques globales de antes pasan a ser compuestos por tenant
-- =========================================================================
DROP INDEX "appointments_code_key";
DROP INDEX "clients_phone_key";
DROP INDEX "discounts_code_key";
DROP INDEX "parameter_categories_key_key";

-- =========================================================================
-- 8) Indices nuevos
-- =========================================================================
CREATE INDEX "appointments_tenantId_idx" ON "appointments"("tenantId");
CREATE UNIQUE INDEX "appointments_tenantId_code_key" ON "appointments"("tenantId", "code");
CREATE INDEX "articles_tenantId_idx" ON "articles"("tenantId");
CREATE INDEX "clients_tenantId_idx" ON "clients"("tenantId");
CREATE UNIQUE INDEX "clients_tenantId_phone_key" ON "clients"("tenantId", "phone");
CREATE INDEX "cuts_tenantId_idx" ON "cuts"("tenantId");
CREATE INDEX "discounts_tenantId_idx" ON "discounts"("tenantId");
CREATE UNIQUE INDEX "discounts_tenantId_code_key" ON "discounts"("tenantId", "code");
CREATE INDEX "orden_compra_items_tenantId_idx" ON "orden_compra_items"("tenantId");
CREATE INDEX "ordenes_compra_tenantId_idx" ON "ordenes_compra"("tenantId");
CREATE INDEX "parameter_categories_tenantId_idx" ON "parameter_categories"("tenantId");
CREATE UNIQUE INDEX "parameter_categories_tenantId_key_key" ON "parameter_categories"("tenantId", "key");
CREATE INDEX "parameter_items_tenantId_idx" ON "parameter_items"("tenantId");
CREATE INDEX "proveedor_productos_tenantId_idx" ON "proveedor_productos"("tenantId");
CREATE INDEX "proveedores_tenantId_idx" ON "proveedores"("tenantId");
CREATE INDEX "sale_items_tenantId_idx" ON "sale_items"("tenantId");
CREATE INDEX "sales_tenantId_idx" ON "sales"("tenantId");
CREATE INDEX "stock_movements_tenantId_idx" ON "stock_movements"("tenantId");
CREATE INDEX "treasury_entries_tenantId_idx" ON "treasury_entries"("tenantId");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX "work_schedules_tenantId_idx" ON "work_schedules"("tenantId");
CREATE INDEX "work_sessions_tenantId_idx" ON "work_sessions"("tenantId");

-- =========================================================================
-- 9) Foreign keys hacia tenants
-- =========================================================================
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_settings" ADD CONSTRAINT "appointment_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cuts" ADD CONSTRAINT "cuts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parameter_categories" ADD CONSTRAINT "parameter_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parameter_items" ADD CONSTRAINT "parameter_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "articles" ADD CONSTRAINT "articles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "treasury_entries" ADD CONSTRAINT "treasury_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proveedor_productos" ADD CONSTRAINT "proveedor_productos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
