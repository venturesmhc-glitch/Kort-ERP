-- AlterTable
ALTER TABLE "users" ADD COLUMN     "esBarbero" BOOLEAN NOT NULL DEFAULT false;

-- Los usuarios que ya son Barbero por rol quedan marcados tambien por el
-- flag, para no depender de la logica de la app en el backfill.
UPDATE "users" SET "esBarbero" = true WHERE "role" = 'BARBERO';
